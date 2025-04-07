import { Injectable, OnModuleInit } from '@nestjs/common';
import { ethers, JsonRpcProvider } from 'ethers';
import * as dotenv from 'dotenv';
import { Campaign, CampaignDocument, CampaignSchema } from 'src/schemas/Campaign.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {ABI} from "../common/abi";
import {updateLastProcessedBlock,getLastProcessedBlock} from "../common/utils";


dotenv.config();
const privateKey = process.env.PRIVATE_KEY || 'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const rpcUrl = process.env.RPC_URL || 'http://127.0.0.1:8545';
const contractAddress = process.env.CONTRACT_ADDRESS || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';


@Injectable()
export class Web3Service  implements OnModuleInit {
 
  private provider: JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract;

    private contractAbi = ABI;
   
    constructor(
        @InjectModel(Campaign.name) private campaignModel: Model<CampaignDocument>
    ) {
        console.log('RPC URL:', rpcUrl);
        console.log('Contract Address:', contractAddress);

        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        this.contract = new ethers.Contract(contractAddress, this.contractAbi, this.provider);

        //this.listenToEvents();
      }
    async onModuleInit() {
      await this.listenToEvents();
    }

    async listenToEvents() {
      const filter = {};         // this.contract.filters.CampaignCreated();
      let lastProcessedBlock = getLastProcessedBlock(); 
  
      // Polling every 10 seconds for new events
      setInterval(async () => {
        try {
         const latestBlock = await this.provider.getBlockNumber();
 
          // Ako već imamo najnoviji blok, nema potrebe za novim upitom
         if (latestBlock <= lastProcessedBlock) return;
 
         const logs = await this.provider.getLogs({
           ...filter,
           fromBlock: lastProcessedBlock+1,
           toBlock: 'latest',
         });
         if (logs.length > 0) {
           logs.forEach(async (log) => {
             const parsedLog = this.contract.interface.parseLog(log);
             if (!parsedLog) {
               console.error('Failed to parse log:', log);
               return; 
             }
             const event = parsedLog.args;
             console.log(`Event found: ${parsedLog.name} in block ${log.blockNumber}`);


             // Switch to choose which event was emited
             if (parsedLog.name === "Voted") {
              console.log(`Vote: Voter = ${event.voter}, Campaign ID = ${event.campaignId}, value = ${event.amount}`);
              const existingCampaign = await this.campaignModel.findOne({ id: Number(event.campaignId) });
              if (existingCampaign) {
                await this.campaignModel.findOneAndUpdate(
                  { id: Number(event.campaignId) },
                  { $inc: { balance: Number(event.amount), numberOfVotes: 1 } }
                );
              }
    
            }
   
            if(parsedLog.name == "CampaignCreated"){
              const existingCampaign = await this.campaignModel.findOne({ id: Number(event.campaignId) });

               if (!existingCampaign) {
                 const newCampaign = new this.campaignModel({
                   id: Number(event.campaignId),
                   creator: String(event.creator),
                   threshold: String(event.threshold), // to convert from wei to ether
                   balance: 0,
                   beneficiary: event.beneficiary, 
                   numberOfVotes: 0,
                   closed: false,
                 });
     
                 await newCampaign.save();
               }
            }    

            if(parsedLog.name=="Unvoted"){
              console.log(`Unvote: Voter = ${event.voter}, Campaign ID = ${event.campaignId}, value = ${event.amount}`);

              const existingCampaign = await this.campaignModel.findOne({ id: Number(event.campaignId) });
              if (existingCampaign) {
                await this.campaignModel.findOneAndUpdate(
                  { id: Number(event.campaignId) },
                  { $inc: { balance: -Number(event.amount), numberOfVotes: -1 } }
                );
              }
            }

            if(parsedLog.name=="CampaignClosed"){
              console.log(`Campaign Closed: ID = ${event.campaignId}, amount transferred = ${event.amountTransferred}`);
              const existingCampaign = await this.campaignModel.findOne({ id: Number(event.campaignId) });
              if (existingCampaign) {
                await this.campaignModel.findOneAndUpdate(
                  { id: Number(event.campaignId) },
                  { closed: true, numberOfVotes: 0 },
                  { $dec: { balance: Number(event.amountTransferred) } },
                  
                );
              }
            }

            if(parsedLog.name=="FundsClaimed"){
              console.log(`Funds Claimed: amount = ${event.fundsToClaim}`);
              await this.campaignModel.findOneAndUpdate(
                { closed: true },
                { balance: 0 }
              );
              
            }
            
            // Update last processed block
            lastProcessedBlock = log.blockNumber;
            await updateLastProcessedBlock(lastProcessedBlock);
           });
         }
        } catch (error) {
          console.error('Error fetching logs:', error);
        }
      }, 10000); // Poll every 10 seconds
    }


}


