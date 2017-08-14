#Copyright 2017 Brigham Young University
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

#!/usr/bin/python
import urllib
from urllib.request import Request, urlopen
import json
import time
import sys
import os
import boto3

code_pipeline = boto3.client('codepipeline')

def http_get(url, headers={}):
    req = Request(url)

    for header_name, header_value in headers.items():
        req.add_header(header_name, header_value)

    response = urlopen(req)
    response_data = response.read().decode('utf-8')
    status_code = response.getcode()
    response.close()
    return response_data, status_code


def start_tests(runscope_trigger_url):
    response, status_code = http_get(runscope_trigger_url)

    # response = requests.get(runscope_trigger_url)
    assert status_code == 201, "Not 201 Created, response code: {}".format(str(response.status_code))
    test_start_data = json.loads(response)
    assert test_start_data['meta']['status'] == "success", "the request to run the tests did not succeed.  details: {}".format(response.text)

    print("started the runscope tests")

    tests = []
    for run in test_start_data['data']['runs']:
        test = {}
        test['url'] = "https://api.runscope.com/buckets/{}/tests/{}/results/{}".format(run['bucket_key'], run['test_id'], run['test_run_id'])
        test['status'] = 'outstanding'
        tests.append(test)
    return tests

def wait_for_tests_to_complete(tests, runscope_access_token):
    while True:
        get_outstanding_tests(tests, runscope_access_token)
        aggregate_status = check_status(tests)
        if aggregate_status == 'pass':
            print("the tests all passed")
            return "pass"
        elif aggregate_status == 'fail':
            print("at least one of the tests failed")
            return "fail"
        else:
            print("the tests are still running, sleeping for 10 second and trying again")
            time.sleep(10)

def check_status(tests):
    for test in tests:
        print("checking {}: {}".format(test['url'], test['status']))
        if test['status'] == "fail":
            return "fail"
        if test['status'] not in ["pass", "fail"]:
            return "outstanding"
    return "pass" #we managed to get here without finding a test that was failed or outstanding, so they must have all passed

def get_outstanding_tests(tests, runscope_access_token):
    for test in tests:
        if test['status'] not in ["pass", "fail"]:
            get_test(test, runscope_access_token)

def get_test(test, runscope_access_token):
    print("calling {}".format(test['url']))
    print(runscope_access_token)
    response, status_code = http_get(test['url'], headers={"Authorization": "Bearer {}".format(runscope_access_token)})
    data = json.loads(response)
    if data['data'].get('result'):
        test['status'] = data['data']['result']

def run_tests(event, context):
    """Run Runscope tests for a CodePipeline

    Args:
    event: The CodePipeline json input
    context: lambda execution context

    """
    try:
        jobId = event['CodePipeline.job']['id']
        user_parameters = json.loads(event['CodePipeline.job']['data']['actionConfiguration']['configuration']['UserParameters'])
        runscope_trigger_url = user_parameters['runscopeTriggerUrl']
        runscope_access_token = user_parameters['runscopeAccessToken']

        tests = start_tests(runscope_trigger_url)
        aggregate_status = wait_for_tests_to_complete(tests, runscope_access_token)
        if aggregate_status == "pass":
            code_pipeline.put_job_success_result(jobId=jobId)
        else:
            code_pipeline.put_job_failure_result(jobId=jobId, failureDetails={
                'type': 'JobFailed',
                'message': 'One or more tests failed'
            })
    except Exception as e:
        print(e)
        code_pipeline.put_job_failure_result(jobId=jobId, failureDetails={
            'type': 'JobFailed',
            'message': 'Unhandled exception during Runscope tests execution: ' + e.message
        })
