#!/usr/bin/env python3
"""CDK app entry point.

All site-specific values come from environment variables so this code stays
generic. Required:

    CDK_DEFAULT_ACCOUNT     AWS account ID (set automatically by AWS CLI/SDK
                            when a profile is configured, or by the deploy
                            workflow via `aws sts get-caller-identity`).
    SITE_DOMAIN             Apex domain whose Route 53 hosted zone you own
                            (e.g. "example.com").
    SITE_GITHUB_ORG         GitHub organization or username that owns the
                            forked repo.
    SITE_GITHUB_REPO        Forked repo name (e.g. "code-explainer").

Optional:

    CDK_DEFAULT_REGION      Defaults to us-east-1 (required for CloudFront).
    SITE_SUBDOMAIN          Defaults to "code-explainer.<SITE_DOMAIN>".
"""

import os
import sys

import aws_cdk as cdk

from stacks.code_explainer_stack import CodeExplainerStack


def _required(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        sys.exit(
            f"{name} is not set. See cdk/app.py for the full list of required "
            "deploy environment variables."
        )
    return value


app = cdk.App()

ACCOUNT = _required("CDK_DEFAULT_ACCOUNT")
REGION = os.environ.get("CDK_DEFAULT_REGION", "us-east-1")
DOMAIN = _required("SITE_DOMAIN")
SUBDOMAIN = os.environ.get("SITE_SUBDOMAIN", f"code-explainer.{DOMAIN}")
GITHUB_ORG = _required("SITE_GITHUB_ORG")
GITHUB_REPO = _required("SITE_GITHUB_REPO")

CodeExplainerStack(
    app,
    "CodeExplainerStack",
    env=cdk.Environment(account=ACCOUNT, region=REGION),
    domain=DOMAIN,
    subdomain=SUBDOMAIN,
    github_org=GITHUB_ORG,
    github_repo=GITHUB_REPO,
)

app.synth()
