CloudFormation
==============
The *CloudFormation* phase type configures a pipeline phase to deploy a CloudFormation template

Parameters
----------

.. list-table::
   :header-rows: 1
   
   * - Parameter
     - Type
     - Required
     - Default
     - Description
   * - type
     - string
     - Yes
     - cloudformation
     - This must always be *cloudformation* for the CloudFormation phase type.
   * - template_path
     - string
     - Yes
     - 
     - The path in your repository to your CloudFormation template.
   * - deploy_role
     - string
     - Yes
     -
     - The role CloudFormation will use to create your role. This role must already exist in your account and must be assumable by CloudFormation.

Secrets
-------
This phase type doesn't prompt for any secrets when creating the pipeline.

Example Phase Configuration
---------------------------
This snippet of a handel-codepipeline.yml file shows the CloudFormation phase being configured:

.. code-block:: yaml

    version: 1

    pipelines:
      dev:
        phases:
        ...
        - type: cloudformation
          name: Deploy
          template_path: cf-stack.yml
          deploy_role: myservicerole
        ...
