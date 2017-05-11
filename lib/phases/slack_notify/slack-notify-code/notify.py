#!/usr/bin/env python
#Copyright 2016 Brigham Young University
#
#Licensed under the Apache License, Version 2.0 (the "License");
#you may not use this file except in compliance with the License.
#You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
#Unless required by applicable law or agreed to in writing, software
#distributed under the License is distributed on an "AS IS" BASIS,
#WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#See the License for the specific language governing permissions and
#limitations under the License.

##
# Modified from https://github.com/byu-oit-appdev/aws-codepipeline-lambda-slack-webhook
#

import sys
import os
import urllib
from urllib.request import Request, urlopen
import json
import boto3

code_pipeline = boto3.client('codepipeline')

def send_post(event, context):
  """Notify Slack of CodePipeline event

  Args:
    event: The CodePipeline json input
    context: lambda execution context

  """

  jobId = event['CodePipeline.job']['id']
  user_parameters = json.loads(event['CodePipeline.job']['data']['actionConfiguration']['configuration']['UserParameters'])
  webhook = user_parameters['webhook']
  username = user_parameters['username']
  message = user_parameters['message']
  channel = user_parameters['channel']

  #Slack webhook post
  try:
    data = json.dumps({
      "username": username,
      "icon_emoji": ':white_check_mark:',
      "channel": channel,
      "text": message
    })
    clen = len(data)
    req = Request(webhook, data.encode('utf-8'), {'Content-Type': 'application/json', 'Content-Length': clen})
    f = urlopen(req)
    response = f.read()
    f.close()
    print(response)
    
    code_pipeline.put_job_success_result(jobId=jobId)
  except urllib.error.HTTPError as e:
  	code_pipeline.put_job_failure_result(jobId=jobId, failureDetails={
        'type': 'JobFailed',
        'message': str(e)
    })
  except urllib.error.URLError as e:
    code_pipeline.put_job_failure_result(jobId=jobId, failureDetails={
        'type': 'JobFailed',
        'message': str(e)
    })

    