CodeBuild
=========
The *CodeBuild* phase type configures a pipeline phase to build the source code pulled from the repository. The second phase of every pipeline created with Handel-CodePipeline must be a build code phase such as this CodeBuild type.

Build Configuration
-------------------
You can specify any arbitrary build process in this phase using the `buildspec.yml file <http://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html>`_. You must have this *buildspec.yml* file in the root of your repository or the CodeBuild phase will fail.

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
     - codebuild
     - This must always be *codebuild* for the CodeBuild phase type.
   * - name
     - string
     - Yes
     -
     - The value you want to show up in the CodePipeline UI as your phase name.
   * - build_image
     - string
     - Yes
     - 
     - The name of the CodeBuild image to use when building your code. See the `CodeBuild documentation <http://docs.aws.amazon.com/codebuild/latest/userguide/build-env-ref.html>`_ for a list of images.
   * - environment_variables
     - map
     - No
     - {}
     - A set of key/value pairs that will be injected into the running CodeBuild jobs.
   * - extra_resources
     - :ref:`codebuild-extras`
     - No
     -
     - A list of extra resources that are necessary to build your code. For example, an S3 bucket in which to cache files.

.. NOTE::

  You can use a custom build image in your account's EC2 Container Registry by prefixing the build_image parameter with *<account>/*. For example, *<account>/IMAGE:TAG* will resolve at run-time to AWS_ACCOUNT_ID.dkr.ecr.AWS_REGION.amazonaws.com/IMAGE:TAG.
  
  Using a custom build image also configures the CodeBuild image in privileged mode, which allows you to run Docker inside your image if needed.

.. _codebuild-extras:

Extra Resources
~~~~~~~~~~~~~~~

The `extra_resources` section is defined by the following schema:

.. code-block:: yaml

    extra_resources:
      <resource_name>:
        type: <service_type>
        <service_param>: <param_value>

Example S3 bucket:

.. code-block:: yaml

    extra_resources:
      cache-bucket:
        type: s3
        bucket_name: my-cache-bucket

The configuration for extra resources matches the configuration in `Handel <https://handel.readthedocs.io>`_, except that extra resources cannot declare their own dependencies in the `dependencies` block.

The following services are currently supported in `extra_resources`:

* `API Access <https://handel.readthedocs.io/en/latest/supported-services/apiaccess.html>`_
* `DynamoDB <https://handel.readthedocs.io/en/latest/supported-services/dynamodb.html>`_
* `S3 <https://handel.readthedocs.io/en/latest/supported-services/s3.html>`_

Environment Variable Prefix
***************************

Your extra resources will be exposed to your build as environment variables.

Every environment variable injected by Handel for service dependencies has a common prefix in the environment variable name.

This environment variable prefix is defined with the following structure:

.. code-block:: none

   <SERVICE_TYPE>_<APP_NAME>_<PIPELINE_NAME>_<SERVICE_NAME>

These values come from the resource declaration in your Handel-Codepipeline file. In the above example, the referencing build would need to use the following values in that prefix:

.. code-block:: none

    service_type = "s3"
    app_name = "pipeline-example"
    pipeline_name = "build"
    service_name = "cache-bucket"

.. NOTE::

   All Handel injected environment variables will be all upper-cased, with dashes converted to underscores. In the above example, the build would need to use the following prefix for the S3 bucket:

   .. code-block:: none

      S3_PIPELINE_EXAMPLE_BUILD_CACHE_BUCKET

   Note that everything in the above prefix is upper-cased, and the app name "beanstalk-example" has been converted to to use underscores instead of dashes


Secrets
-------
This phase type doesn't prompt for any secrets when creating the pipeline.

Example Phase Configuration
---------------------------
This snippet of a handel-codepipeline.yml file shows the CodeBuild phase being configured:

.. code-block:: yaml
    
    version: 1

    pipelines:
      dev:
        phases:
        ...
        - type: codebuild
          name: Build
          build_image: aws/codebuild/docker:1.12.1
          environment_Variables:
            MY_CUSTOM_ENV: my_custom_value
        ...

This is a snippet of a handel-codepipeline.yml file which includes an S3 bucket as an extra resource:

.. code-block:: yaml

    version: 1

    pipelines:
      dev:
        phases:
        ...
        - type: codebuild
          name: Build
          build_image: aws/codebuild/docker:1.12.1
          environment_Variables:
            MY_CUSTOM_ENV: my_custom_value
          extra_resources:
            cache_bucket:
              type: s3
              #Everything else, including the name, is optional
        ...