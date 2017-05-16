Using Handel-CodePipeline
=========================
Handel-CodePipeline is a command-line utility that you can use to facilitate creation of CodePipelines that use the Handel library for deployment. This page details how to use this library.

AWS Permissions
---------------
When you run Handel-CodePipeline to create a new pipeline, you must run it with a set of AWS IAM credentials that have administrator privileges. This is because Handel-CodePipeline creates roles for the deploy phase of the pipeline that have administrator privileges. 

Once the pipeline is created, it will only use the created role for deployments, so you won't need to keep the user around with administrator privileges. Since human users are recommended to have non-administrative permissions, it is recommended you use a temporary user with admin permissions to create the pipeline, then delete that user once the pipeline is created.

Creating New Pipelines
----------------------
To create a new pipeline, do the following:

1. Make sure you have already created your `Handel file <https://handel.readthedocs.io/en/latest/handel-basics/handel-file.html>`_ that specifies how your application should be deployed.
2. Create a new :ref:`handel-codepipeline-file` in your repository. 
3. Install Handel-CodePipeline:

    .. code-block:: none
    
        npm install -g handel-codepipeline

4. Run Handel-CodePipeline:

    .. code-block:: none

        handel-codepipeline

5. Handel-CodePipeline will walk you through a series of questions, asking you to provide further input:

    .. code-block:: none

        Welcome to the Handel CodePipeline setup wizard
        ? Please enter the path to the application's Handel config file ./handel.yml
        ? Please enter the path to the Handel-CodePipeline config file ./handel-codepipeline.yml
        ? Please enter the path to the directory containing the Handel account configuration files /path/to/account/config/files
        ? Please enter a valid GitHub access token (CodePipeline will use this to pull your repo) SOMEFAKETOKEN
        ? What is the ID of the account you wish to use for your pipeline 'dev' 111111111111

After you provide the appropriate input, Handel-CodePipeline will create the pipeline with the specified phases.