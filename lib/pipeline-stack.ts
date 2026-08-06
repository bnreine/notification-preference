import * as cdk from 'aws-cdk-lib';
import { PipelineType } from 'aws-cdk-lib/aws-codepipeline';
import { CodePipelineSource, ShellStep } from 'aws-cdk-lib/pipelines';
import { Construct } from 'constructs';
import { AppStage } from './app-stage';

export interface PipelineStackProps extends cdk.StackProps {
  /**
   * CodeStar Connections ARN for the Git provider (GitHub, GitLab, Bitbucket).
   * Create one in the AWS Console under Developer Tools > Connections.
   */

}

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

      const githubConnectionArn = cdk.Fn.importValue('GlobalGitHubConnectionArn');

    const pipeline = new cdk.pipelines.CodePipeline(this, 'Pipeline', {
        codeBuildDefaults: {
            buildEnvironment: {
                buildImage: cdk.aws_codebuild.LinuxBuildImage.STANDARD_7_0,
            },
            partialBuildSpec: cdk.aws_codebuild.BuildSpec.fromObject({
                version: '0.2',
                phases: {
                    install: {
                        'runtime-versions': {
                            nodejs: 22,
                        },
                    },
                },
            }),
        },
      pipelineName: 'NotificationPreferencePipeline',
      pipelineType: PipelineType.V2,
        selfMutation: true,
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.connection('bnreine/notification-preference', 'main', {
          connectionArn: githubConnectionArn,
            triggerOnPush: true,
        }),
        commands: ['npm ci', 'npx cdk synth'],
      }),
    });

    pipeline.addStage(
      new AppStage(this, 'Production', {
        env: {
          account: this.account,
          region: this.region,
        },
      }),
    );
  }
}
