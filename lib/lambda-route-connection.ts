import * as apigw from 'aws-cdk-lib/aws-apigatewayv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export interface LambdaRouteConnectionProps {
  lambdaFunction: lambda.IFunction;
  region: string;
  apiId: string;
  routeKey: string;
}

export class LambdaRouteConnection extends Construct {
  constructor(scope: Construct, id: string, props: LambdaRouteConnectionProps) {
    super(scope, id);

    const { lambdaFunction, region, apiId, routeKey } = props;

    const integrationRole = new iam.Role(this, `${id}-integration-role`, {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
    });

    lambdaFunction.grantInvoke(integrationRole);

    const integrationUri = `arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/${lambdaFunction.functionArn}/invocations`;

    const integration = new apigw.CfnIntegration(this, `${id}-integration`, {
      integrationType: 'AWS_PROXY',
      integrationUri,
      credentialsArn: integrationRole.roleArn,
      apiId,
      payloadFormatVersion: '2.0',
      connectionType: 'INTERNET',
      integrationMethod: 'POST',
      passthroughBehavior: 'WHEN_NO_MATCH',
      timeoutInMillis: 29000,
    });

    const route = new apigw.CfnRoute(this, `${id}-route`, {
      apiId,
      routeKey,
      target: `integrations/${integration.ref}`,
    });

    route.addResourceDependency(integration);
  }
}
