import { Module } from '@nestjs/common';
import { Web3Controller } from './web3.controller';
import { Web3Service } from './web3.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Campaign, CampaignSchema } from 'src/schemas/Campaign.schema';
import { CampaignModule } from 'src/campaign/campaign.module';
import { EventListenerService } from './event-listener.service';

@Module({
  imports: [
   CampaignModule
  ],
  controllers: [Web3Controller],
  providers: [EventListenerService]
})
export class Web3Module {}
