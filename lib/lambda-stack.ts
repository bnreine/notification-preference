import * as cdk from 'aws-cdk-lib';
import { Duration, aws_ec2 } from 'aws-cdk-lib';
import { Runtime, LayerVersion, Code } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import * as path from 'path';
import { LambdaRouteConnection } from './lambda-route-connection';

const API_GATEWAY_ID_SSM_PARAMETER = '/notifications/apigateway/api2/id';

export class LambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);


      // const vpcId = ssm.StringParameter.valueForStringParameter(
      //     this,
      //     '/shared-resources/vpc-id',
      // );
      //
      //
      // const vpc = aws_ec2.Vpc.fromLookup(this, 'Vpc', {
      //     vpcId,
      // });
      //
      //
      // const rdsSgId = ssm.StringParameter.valueForStringParameter(
      //     this,
      //     '/notifications/rds-sg-id'
      // );
      //
      // const rdsSg = aws_ec2.SecurityGroup.fromSecurityGroupId(
      //     this,
      //     'RdsSg',
      //     rdsSgId,
      //     { mutable: true }
      // );

    const apiId = ssm.StringParameter.valueForStringParameter(
      this,
      API_GATEWAY_ID_SSM_PARAMETER,
    );

      const defaultAuthorizerId = ssm.StringParameter.valueForStringParameter(
          this,
          "/notifications/apigateway/api2/default-authorizer-id"
      );

      const defaultAuthorizerType = ssm.StringParameter.valueForStringParameter(
          this,
          "/notifications/apigateway/api2/default-authorizer-type"
      );


      const sharedLayer = new LayerVersion(this, 'SharedLayer', {
          code: Code.fromAsset(
              path.join(__dirname, '../../src/shared')
          ),

          compatibleRuntimes: [
              Runtime.NODEJS_22_X,
          ],

          description: 'Shared code for notification API lambdas',
      });



    const listLambdaDir = path.join(__dirname, '../../src/list');
    const postLambdaDir = path.join(__dirname, '../../src/post');
    const getLambdaDir = path.join(__dirname, '../../src/get');
    const deleteLambdaDir = path.join(__dirname, '../../src/delete');

    const listLambda = new NodejsFunction(this, 'PreferencesListLambda', {
      runtime: Runtime.NODEJS_22_X,
      entry: path.join(listLambdaDir, 'index.js'),
      handler: 'handler',
      timeout: Duration.seconds(29),
      projectRoot: listLambdaDir,
      depsLockFilePath: path.join(listLambdaDir, 'package-lock.json'),
        layers: [sharedLayer],

        bundling: {
            externalModules: ['/opt/*'],
            format: OutputFormat.ESM,
        },
    });

    new LambdaRouteConnection(this, 'PreferencesListRoute', {
      lambdaFunction: listLambda,
      region: this.region,
      apiId,
      routeKey: 'GET /configurations/{configurationId}/preferences',
      authorizationType: defaultAuthorizerType,
      authorizerId: defaultAuthorizerId,
    });

    const postLambda = new NodejsFunction(this, 'PreferencesPostLambda', {
      runtime: Runtime.NODEJS_22_X,
      entry: path.join(postLambdaDir, 'index.js'),
      handler: 'handler',
      timeout: Duration.seconds(29),
      projectRoot: postLambdaDir,
      depsLockFilePath: path.join(postLambdaDir, 'package-lock.json'),
    });

    new LambdaRouteConnection(this, 'PreferencesPostRoute', {
      lambdaFunction: postLambda,
      region: this.region,
      apiId,
      routeKey: 'POST /configurations/{configurationId}/preferences',
      authorizationType: defaultAuthorizerType,
      authorizerId: defaultAuthorizerId,
    });



    //   const getLambdaSecurityGroup = new aws_ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
    //       vpc,
    //       description: 'Security group for Notification Lambda functions',
    //       allowAllOutbound: true, // Allows the Lambda to initiate connections (e.g. to RDS)
    //   });
    //
    const getLambda = new NodejsFunction(this, 'PreferencesGetLambda', {
      runtime: Runtime.NODEJS_22_X,
      entry: path.join(getLambdaDir, 'index.js'),
      handler: 'handler',
      timeout: Duration.seconds(29),
      projectRoot: getLambdaDir,
      depsLockFilePath: path.join(getLambdaDir, 'package-lock.json'),
        // vpc,
        // vpcSubnets: {
        //     subnetType: aws_ec2.SubnetType.PRIVATE_WITH_EGRESS,
        // },
        // securityGroups: [getLambdaSecurityGroup],
    });
    //
    //   rdsSg.addIngressRule(
    //       getLambdaSecurityGroup,
    //       aws_ec2.Port.tcp(5432),
    //       "Allow Lambda to connect"
    //   );


    new LambdaRouteConnection(this, 'PreferencesGetRoute', {
      lambdaFunction: getLambda,
      region: this.region,
      apiId,
      routeKey:
        'GET /configurations/{configurationId}/preferences/{preferenceId}',
      authorizationType: defaultAuthorizerType,
      authorizerId: defaultAuthorizerId,
    });

    const deleteLambda = new NodejsFunction(this, 'PreferencesDeleteLambda', {
      runtime: Runtime.NODEJS_22_X,
      entry: path.join(deleteLambdaDir, 'index.js'),
      handler: 'handler',
      timeout: Duration.seconds(29),
      projectRoot: deleteLambdaDir,
      depsLockFilePath: path.join(deleteLambdaDir, 'package-lock.json'),
    });

    new LambdaRouteConnection(this, 'PreferencesDeleteRoute', {
      lambdaFunction: deleteLambda,
      region: this.region,
      apiId,
      routeKey:
        'DELETE /configurations/{configurationId}/preferences/{preferenceId}',
      authorizationType: defaultAuthorizerType,
      authorizerId: defaultAuthorizerId,
    });
  }
}
