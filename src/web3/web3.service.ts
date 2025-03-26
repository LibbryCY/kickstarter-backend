import { Injectable, OnModuleInit } from '@nestjs/common';
import { ethers, JsonRpcProvider } from 'ethers';
import * as dotenv from 'dotenv';
import { Campaign, CampaignDocument, CampaignSchema } from 'src/schemas/Campaign.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {ABI} from "../consts/abi";


dotenv.config();
const privateKey = process.env.PRIVATE_KEY || 'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const rpcUrl = process.env.RPC_URL || 'http://127.0.0.1:8545';
const contractAddress = process.env.CONTRACT_ADDRESS || '0x0';


@Injectable()
export class Web3Service  implements OnModuleInit {
 
  private provider: JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract;

    private contractAbi = [
        "event CampaignCreated(uint256 indexed campaignId,address creator, uint256 threshold, address beneficiary)",
        "event Voted(uint256 indexed campaignId, address indexed voter, uint256 amount)",
        "event Unvoted(uint256 indexed campaignId, address indexed voter, uint256 amount)",
        "event CampaignClosed(uint256 indexed campaignId, uint256 amountTransferred)",
        "event FundsClaimed(uint256 indexed campaignId)",
    ];
   
    constructor(
        @InjectModel(Campaign.name) private campaignModel: Model<CampaignDocument>
    ) {
        console.log('RPC URL:', rpcUrl);
        console.log('Contract Address:', contractAddress);

        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        this.contract = new ethers.Contract(contractAddress, ABI, this.provider);

        //this.listenToEvents();
      }
  async onModuleInit() {
    await this.listenToEvents();
  }
    
      listenToEvents() {
        console.log('Listening to events...');
        // Event listener za CampaignCreated
        this.contract.on('CampaignCreated', async (campaignId: number, creator: string, goal: number, beneficiary: string) => {
          console.log(`Campaign Created: ID = ${campaignId}, Creator = ${creator}, Goal = ${goal}, Beneficiary = ${beneficiary}`);
            const newCampaign = new this.campaignModel({
                id: campaignId,
                creator: creator,
                threshold: goal,
                balance: 0,
                beneficiary: beneficiary, 
                numberOfVotes: 0,
                closed: false,
            });

            await newCampaign.save();
        });
    
        // Event listener za Voted
        this.contract.on('Voted', async (campaignId: number, voter: string, amount: number) => {
          console.log(`Voter: ${voter} voted ${amount} for campaign ${campaignId}`);
          await this.campaignModel.findOneAndUpdate(
        { id: campaignId },
        { $inc: { balance: amount, numberOfVotes: 1 } }
        );

        });
    
        // Event listener za Unvoted
        this.contract.on('Unvoted', async (campaignId: number, voter: string, amount: number) => {
          console.log(`Voter: ${voter} unvoted ${amount} from campaign ${campaignId}`);
          await this.campaignModel.findOneAndUpdate(
            { id: campaignId },
            { $inc: { balance: -amount, numberOfVotes: -1 }}
          )
        });
    
        // Event listener za CampaignClosed
        this.contract.on('CampaignClosed', async (campaignId: number,amount:number) => {
          console.log(`Campaign Closed: ID = ${campaignId}`);
          await this.campaignModel.findOneAndUpdate({id:campaignId},{closed:true,numberOfVotes:0},{$inc:{balance:-amount}});
        });
    
        // Event listener za FundsClaimed
        this.contract.on('FundsClaimed', async (campaignId: number) => {
          console.log(`Funds Claimed: Campaign ID = ${campaignId}`);
          await this.campaignModel.findOneAndUpdate(
            { id: campaignId },
            { balance: 0 }
          );
        });
      }


}
