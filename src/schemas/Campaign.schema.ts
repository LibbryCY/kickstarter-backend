
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CampaignDocument = Campaign & Document;

@Schema()
export class Campaign {
  @Prop({ required: true ,unique:true})
  id: number;

  @Prop({ required: true })
  creator: string;

  @Prop({ required: true })
  threshold: string;

  @Prop({ required: true })
  balance: number;

  @Prop({ required: true })
  beneficiary: string;

  @Prop({ default: 0 })
  numberOfVotes: number;

  @Prop({ default: false })
  closed: boolean;

  @Prop({ type: Date, default: Date.now })  
  createdAt: Date;
}

export const CampaignSchema = SchemaFactory.createForClass(Campaign);
