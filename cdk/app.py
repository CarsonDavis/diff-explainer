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
    SITE_GITHUB_REPO        Forked repo name (e.g. "diff-explainer").

Optional:

    CDK_DEFAULT_REGION      Defaults to us-east-1 (required for CloudFront).
    SITE_SUBDOMAIN          Defaults to "diff-explainer.<SITE_DOMAIN>".
"""

import os
import sys

import aws_cdk as cdk

from stacks.diff_explainer_stack import DiffExplainerStack


def _required(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        sys.exit(
            f"{name} is not set. See cdk/app.py for the full list of required "
            "deploy environment variables."
        )
    return value


def _optional(name: str, default: str) -> str:
    # `os.environ.get(name, default)` only returns the default when the key is
    # absent — not when it's set to an empty string. GitHub Actions env: blocks
    # interpolating an unset `vars.X` produce empty strings, so we coerce them
    # to the default explicitly.
    return os.environ.get(name) or default


app = cdk.App()

ACCOUNT = _required("CDK_DEFAULT_ACCOUNT")
REGION = _optional("CDK_DEFAULT_REGION", "us-east-1")
DOMAIN = _required("SITE_DOMAIN")
SUBDOMAIN = _optional("SITE_SUBDOMAIN", f"diff-explainer.{DOMAIN}")
GITHUB_ORG = _required("SITE_GITHUB_ORG")
GITHUB_REPO = _required("SITE_GITHUB_REPO")

DiffExplainerStack(
    app,
    "DiffExplainerStack",
    env=cdk.Environment(account=ACCOUNT, region=REGION),
    domain=DOMAIN,
    subdomain=SUBDOMAIN,
    github_org=GITHUB_ORG,
    github_repo=GITHUB_REPO,
)

app.synth()
