.. _handel-codepipeline-tutorial:

Tutorial
========
This page contains a tutorial showing how to use Handel-CodePipeline to set up a pipeline using Handel for deployments. 

.. IMPORTANT::

    Before going through this tutorial, make sure you have installed Handel-CodePipeline on your machine as shown in the :ref:`installation` section.
    
    This tutorial also assumes you already have an application with a valid `Handel file <http://handel.readthedocs.io/en/latest/>`_ configured.

Tutorial
--------
This tutorial contains the following steps:

1. :ref:`tutorial-write-the-handel-codepipeline-file`
2. :ref:`tutorial-write-the-buildspec-file`
3. :ref:`tutorial-deploy-the-pipeline`

Follow along with each of these steps in the sections below in order to complete the tutorial.

.. NOTE::

    This tutorial assumes you are deploying a Node.js application. You may need to modify some further things in this tutorial if you
    are using another platform.

.. _tutorial-write-the-handel-codepipeline-file:

Write the Handel-CodePipeline File
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
We're going to create a single pipeline with three phases:

1. Pull code from a GitHub branch.
2. Build the project using CodeBuild.
3. Deploy the project using Handel.

Create a file named *handel-codepipeline.yml* in the root of your repository with the following contents:

.. code-block:: yaml

    version: 1

    name: <your-app-name> # Replace with your own app name

    pipelines:
      dev:
        phases:
        - type: github
          name: Source
          owner: <your-github-username> # Replace with your own GitHub username
          repo: <your-github-repo> # Replace with your own GitHub repository name
          branch: master
        - type: codebuild
          name: Build
          build_image: aws/codebuild/nodejs:6.3.1
        - type: handel
          name: Deploy
          environments_to_deploy:
          - dev

.. IMPORTANT::

    Remember to replace the noted sections in the above file with your own information.

.. _tutorial-write-the-buildspec-file:

Write the CodeBuild BuildSpec File
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Our second phase uses the `AWS CodeBuild <https://aws.amazon.com/codebuild/>`_ service to perform any build steps required. This service requires that you put a 
file called *buildspec.yml* at the root of the repository. This file contains instructions about the commands CodeBuild should run.

Create a file called *buildspec.yml* at the root of your repository with the following contents:

.. code-block:: yaml

    version: 0.2

    phases:
      build:
        commands:
        - npm install
    
    artifacts:
      files:
      - ./**/*

You will likely need to modify this file to run different commands for your application build process. See the `CodeBuild documentation <http://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html>`_ for more information on the *buildspec.yml* file.

.. _tutorial-deploy-the-pipeline:

Deploy the Pipeline
~~~~~~~~~~~~~~~~~~~
.. IMPORTANT::

    Before running Handel-CodePipeline, you must be logged into your AWS account on the command line. You can do this by setting your AWS access keys using the AWS CLI.

    See Configuring the AWS CLI for help on doing this once you’ve installed the AWS CLI.

    If you work for an organization that uses federated logins through something like ADFS, then you’ll have a different process for logging in on the command-line. In this case, ask your organization how they login to AWS on the command-line.


Now that you have your *handel-codepipeline.yml* and *buildspec.yml* files, you can deploy the pipeline:

.. code-block:: bash

    handel-codepipeline deploy

The pipeline will ask a series of questions with additional information and secrets it needs:

.. code-block:: none

    info:    Welcome to the Handel CodePipeline setup wizard
    ? Please enter the name of the pipeline from your handel-codepipeline.yml file that you would like to deploy
    ? Please enter the name of the account where your pipeline will be deployed
    ? Please enter the path to the directory containing the Handel account configuration files
    ? 'GitHub' phase - Please enter your GitHub access token

Once you've provided all required information, the pipeline will be created with output something like the following:

.. code-block:: none

    info:    Creating source phase 'GitHub'
    info:    Creating build phase CodeBuild project my-pipeline-dev-Build
    info:    Creating CodePipeline for the pipeline 'my-pipeline-dev'
    info:    Finished creating pipeline in 111111111111

Next Steps
----------
Now that you've deployed a simple pipeline, where do you go next?

Learn more about Handel-CodePipeline
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Read through the following documents in the :ref:`handel-codepipeline-basics` section:

* :ref:`using-handel-codepipeline`
* :ref:`handel-codepipeline-file`

Learn about the different phase types
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Once you understand Handel-CodePipelines's basic configuration, see the :ref:`supported-phase-types` section, which contains information about the different phase types supported in Handel-CodePipeline 
