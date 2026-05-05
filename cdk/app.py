#!/usr/bin/env python3
"""CDK app entry point for code-explainer.codebycarson.com."""

import os
import aws_cdk as cdk

from stacks.code_explainer_stack import CodeExplainerStack

app = cdk.App()

# Same account / region as code-by-carson. Override via env if you ever
# fork this repo to your own AWS account.
ACCOUNT = os.environ.get("CDK_DEFAULT_ACCOUNT", "420665616125")
REGION = os.environ.get("CDK_DEFAULT_REGION", "us-east-1")

CodeExplainerStack(
    app,
    "CodeExplainerStack",
    env=cdk.Environment(account=ACCOUNT, region=REGION),
)

app.synth()
