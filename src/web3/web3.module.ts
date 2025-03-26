import { Module } from '@nestjs/common';
import { Web3Controller } from './web3.controller';
import { Web3Service } from './web3.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Campaign, CampaignSchema } from 'src/schemas/Campaign.schema';
import { CampaignModule } from 'src/campaign/campaign.module';

@Module({
  imports: [
   CampaignModule
  ],
  controllers: [Web3Controller],
  providers: [Web3Service]
})
export class Web3Module {}
