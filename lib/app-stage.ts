import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { LambdaStack } from './lambda-stack';

export interface AppStageProps extends cdk.StageProps {}

export class AppStage extends cdk.Stage {
  public readonly lambdaStack: LambdaStack;

  constructor(scope: Construct, id: string, props?: AppStageProps) {
    super(scope, id, props);

    this.lambdaStack = new LambdaStack(this, 'LambdaStack');
  }
}
