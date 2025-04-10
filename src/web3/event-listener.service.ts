// src/events/event-listener.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import { ABI } from '../common/abi';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Campaign, CampaignDocument } from 'src/schemas/Campaign.schema';


dotenv.config();
const rpcWS = process.env.RPC_WS || '';
const contractAddress = process.env.CONTRACT_ADDRESS || '';


@Injectable()
export class EventListenerService implements OnModuleInit {
  private provider: ethers.WebSocketProvider;
  private contract: ethers.Contract;

  constructor(
    @InjectModel(Campaign.name) private campaignModel: Model<CampaignDocument>
  ) {
    this.provider = new ethers.WebSocketProvider(rpcWS);
    this.contract = new ethers.Contract(
      contractAddress,
      ABI,
      this.provider,
    );
  }

  onModuleInit() {
    this.contract.on('CampaignCreated', async (campaignId, creator, threshold, beneficiary) => {
        const existingCampaign = await this.campaignModel.findOne({ id: Number(campaignId) });

                if (!existingCampaign) {
                  const newCampaign = new this.campaignModel({
                    id: Number(campaignId),
                    creator: String(creator),
                    threshold: String(threshold), 
                    balance: 0,
                    beneficiary: beneficiary, 
                    numberOfVotes: 0,
                    closed: false,
                  });
      
                  await newCampaign.save();
                }
    });

    this.contract.on('Voted', async (campaignId, voter, amount) => {
        console.log(`Vote: Voter = ${voter}, Campaign ID = ${campaignId}, value = ${amount}`);

        const existingCampaign = await this.campaignModel.findOne({ id: Number(campaignId) });

        if (existingCampaign) {
          await this.campaignModel.findOneAndUpdate(
            { id: Number(campaignId) },
            { $inc: { balance: Number(amount), numberOfVotes: 1 } }
          );
        }
    });

    this.contract.on('Unvoted', async (campaignId, voter, amount) => {
        console.log(`Unvote: Voter = ${voter}, Campaign ID = ${campaignId}, value = ${amount}`);

        const existingCampaign = await this.campaignModel.findOne({ id: Number(campaignId) });
        if (existingCampaign) {
          await this.campaignModel.findOneAndUpdate(
            { id: Number(campaignId) },
            { $inc: { balance: -Number(amount), numberOfVotes: -1 } }
          );
        }
    });

    this.contract.on('CampaignClosed', async (campaignId, amountTransferred) => {
        console.log(`Campaign Closed: ID = ${campaignId}, amount transferred = ${amountTransferred}`);
        const existingCampaign = await this.campaignModel.findOne({ id: Number(campaignId) });
        if (existingCampaign) {
          await this.campaignModel.findOneAndUpdate(
            { id: Number(campaignId) },
            { closed: true, numberOfVotes: 0,balance: (existingCampaign.balance>Number(existingCampaign.threshold))?0:existingCampaign.balance  },            
          );
        }
    });

    this.contract.on('FundsClaimed', async (fundsToClaim) => {
        console.log(`Funds Claimed: amount = ${fundsToClaim}`);
        await this.campaignModel.updateMany(
          { closed: true },
          {$set:  {balance: 0} }
        );
        
    });
  }
}
