import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Campaign, CampaignDocument } from 'src/schemas/Campaign.schema';

@Injectable()
export class CampaignService {
    constructor(@InjectModel(Campaign.name) private campaignModel: Model<CampaignDocument>) {}

    async getAllCampaigns() {
        try {
            return this.campaignModel.find().exec();
        } catch (error) {
            console.error("Error fetching campaigns:", error);
            throw error;
          }
    }

    async getCampaignById(id: string): Promise<Campaign | null> {
        try {
          return await this.campaignModel.findOne({ id }).exec();
        } catch (error) {
          console.error("Error fetching campaign:", error);
          throw error;
        }
    } 

    async deleteCampaign(id: string): Promise<Campaign | null> {
        try {
            return this.campaignModel.findOneAndDelete({ id }).exec();
        } catch (error) {
            console.error("Error deleting campaign:", error);
            throw error;
          }
      }
}
