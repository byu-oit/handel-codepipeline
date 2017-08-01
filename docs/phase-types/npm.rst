NPM
======
The *NPM* phase type configures a pipeline phase to deploy one or more of your application npmjs. 

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
     - npm
     - This must always be *npm* for the NPM phase type.
   * - name
     - string
     - Yes
     -
     - The value you want to show up in the CodePipeline UI as your phase name.
   * - build_image
     - string
     - No
     - aws/codebuild/nodejs:6.3.1
     - The code build image needed to deploy project to npm. See here for more info `AWS Codebuild Docs <http://docs.aws.amazon.com/codebuild/latest/userguide/build-env-ref.html>`_

Secrets
-------
In addition to the parameters specified in your handel-codepipeline.yml file, this phase will prompt you for the following secret information when creating your pipeline:

* NPM Token

For Security reasons these are not saved in your handel-codepipeline.yml file. The NPM token can be found in your .npmrc file see `here <http://blog.npmjs.org/post/118393368555/deploying-with-npm-private-modules>`_ for more information.

Example Phase Configuration
---------------------------
This snippet of a handel-codepipeline.yml file shows the NPM phase being configured:

.. code-block:: yaml

    version: 1

    pipelines:
      dev:
        phases:
        ...
        - type: npm
          name: npmDeploy
        ...
