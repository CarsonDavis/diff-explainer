"""CDK stack for code-explainer.codebycarson.com.

Resources:
- S3 bucket (private, OAC)
- CloudFront distribution
- ACM certificate (us-east-1, DNS-validated)
- Route 53 alias (against the codebycarson.com zone owned by the
  code-by-carson stack — read-only-shared)
- IAM role assumed by GitHub Actions via the existing account-level
  OIDC provider, scoped to CarsonDavis/code-explainer

Mirrors the deploy-pattern used by code-by-carson: same account, same
region, same OIDC provider; this stack just owns its own subdomain.
"""

from aws_cdk import (
    CfnOutput,
    Duration,
    RemovalPolicy,
    Stack,
    aws_certificatemanager as acm,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as origins,
    aws_iam as iam,
    aws_route53 as route53,
    aws_route53_targets as targets,
    aws_s3 as s3,
)
from constructs import Construct

DOMAIN = "codebycarson.com"
SUBDOMAIN = f"code-explainer.{DOMAIN}"
GITHUB_ORG = "CarsonDavis"
GITHUB_REPO = "code-explainer"


class CodeExplainerStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # ── Hosted zone (shared, read-only from this stack) ────────
        zone = route53.HostedZone.from_lookup(self, "Zone", domain_name=DOMAIN)

        # ── ACM certificate (us-east-1 for CloudFront) ─────────────
        certificate = acm.Certificate(
            self,
            "SiteCert",
            domain_name=SUBDOMAIN,
            validation=acm.CertificateValidation.from_dns(zone),
        )

        # ── S3 bucket ──────────────────────────────────────────────
        site_bucket = s3.Bucket(
            self,
            "SiteBucket",
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            enforce_ssl=True,
            object_ownership=s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
            removal_policy=RemovalPolicy.DESTROY,
        )

        # ── CloudFront distribution ────────────────────────────────
        # Static export with `trailingSlash: true` emits real index.html
        # files at directory paths (out/index.html, out/about/index.html),
        # so no viewer-request rewrite function is needed.
        distribution = cloudfront.Distribution(
            self,
            "SiteDistribution",
            default_behavior=cloudfront.BehaviorOptions(
                origin=origins.S3BucketOrigin.with_origin_access_control(site_bucket),
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                compress=True,
                response_headers_policy=cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
            ),
            domain_names=[SUBDOMAIN],
            certificate=certificate,
            default_root_object="index.html",
            minimum_protocol_version=cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
            error_responses=[
                cloudfront.ErrorResponse(
                    http_status=403,
                    response_http_status=200,
                    response_page_path="/index.html",
                    ttl=Duration.seconds(0),
                ),
                cloudfront.ErrorResponse(
                    http_status=404,
                    response_http_status=200,
                    response_page_path="/index.html",
                    ttl=Duration.seconds(0),
                ),
            ],
        )

        # ── DNS alias ──────────────────────────────────────────────
        route53.ARecord(
            self,
            "SubdomainAlias",
            zone=zone,
            record_name=SUBDOMAIN,
            target=route53.RecordTarget.from_alias(
                targets.CloudFrontTarget(distribution)
            ),
        )

        # ── GitHub OIDC (account-level, imported) ──────────────────
        oidc_provider = iam.OpenIdConnectProvider.from_open_id_connect_provider_arn(
            self,
            "GitHubOidc",
            f"arn:aws:iam::{self.account}:oidc-provider/token.actions.githubusercontent.com",
        )

        # ── Deploy role for GitHub Actions ─────────────────────────
        # Scoped to this repo specifically — does NOT reuse code-by-carson's
        # role, so the two repos can deploy independently.
        deploy_role = iam.Role(
            self,
            "GitHubActionsRole",
            assumed_by=iam.FederatedPrincipal(
                oidc_provider.open_id_connect_provider_arn,
                conditions={
                    "StringEquals": {
                        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
                    },
                    "StringLike": {
                        "token.actions.githubusercontent.com:sub": f"repo:{GITHUB_ORG}/{GITHUB_REPO}:*",
                    },
                },
                assume_role_action="sts:AssumeRoleWithWebIdentity",
            ),
            description="Role assumed by GitHub Actions for code-explainer deployments",
        )

        # S3 permissions on the site bucket
        site_bucket.grant_read_write(deploy_role)
        site_bucket.grant_delete(deploy_role)

        # CloudFront invalidation on the distribution
        deploy_role.add_to_policy(
            iam.PolicyStatement(
                actions=["cloudfront:CreateInvalidation"],
                resources=[
                    f"arn:aws:cloudfront::{self.account}:distribution/{distribution.distribution_id}"
                ],
            )
        )

        # CDK deploy permissions — narrowly scoped to assuming the CDK
        # bootstrap roles. Modern CDK ("new-style synthesis") delegates all
        # CloudFormation, IAM, and asset-upload work to those roles; the CI
        # principal only needs to assume them.
        #
        # The bootstrap qualifier `hnb659fds` is the default created by
        # `cdk bootstrap`. If the qualifier is ever changed (`cdk bootstrap
        # --qualifier <new>`), update these ARNs to match.
        cdk_qualifier = "hnb659fds"
        cdk_role_arns = [
            f"arn:aws:iam::{self.account}:role/cdk-{cdk_qualifier}-{purpose}-{self.account}-{self.region}"
            for purpose in (
                "deploy-role",
                "file-publishing-role",
                "lookup-role",
            )
        ]
        deploy_role.add_to_policy(
            iam.PolicyStatement(
                actions=["sts:AssumeRole"],
                resources=cdk_role_arns,
            )
        )

        # ── Outputs ────────────────────────────────────────────────
        CfnOutput(self, "SiteBucketName", value=site_bucket.bucket_name)
        CfnOutput(self, "DistributionId", value=distribution.distribution_id)
        CfnOutput(self, "SiteUrl", value=f"https://{SUBDOMAIN}")
        CfnOutput(self, "GitHubActionsRoleArn", value=deploy_role.role_arn)
