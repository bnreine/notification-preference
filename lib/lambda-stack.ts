import * as cdk from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import * as path from 'path';
import { LambdaRouteConnection } from './lambda-route-connection';

const API_GATEWAY_ID_SSM_PARAMETER = '/notifications/apigateway/api2/id';

export class LambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const apiId = ssm.StringParameter.valueForStringParameter(
      this,
      API_GATEWAY_ID_SSM_PARAMETER,
    );

      const defaultAuthorizerId = ssm.StringParameter.valueForStringParameter(
          this,
          "/notifications/api-gateway/api2/default-authorizer-id"
      );

      const defaultAuthorizerType = ssm.StringParameter.valueForStringParameter(
          this,
          "/notifications/api-gateway/api2/default-authorizer-type"
      );

    const listLambdaDir = path.join(__dirname, '../../src/list');

    const listLambda = new NodejsFunction(this, 'PreferencesListLambda', {
      runtime: Runtime.NODEJS_22_X,
      entry: path.join(listLambdaDir, 'index.js'),
      handler: 'handler',
      timeout: Duration.seconds(29),
      projectRoot: listLambdaDir,
      depsLockFilePath: path.join(listLambdaDir, 'package-lock.json'),
    });

    new LambdaRouteConnection(this, 'PreferencesListRoute', {
      lambdaFunction: listLambda,
      region: this.region,
      apiId,
      routeKey: 'GET /configurations/{configurationId}/preferences',
        authorizationType: defaultAuthorizerType,
        authorizerId: defaultAuthorizerId,
    });
  }
}
