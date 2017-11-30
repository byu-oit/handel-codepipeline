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
   * - cache
     - string
     - No
     - `no-cache`
     - Whether to enable a build cache for this phase. Valid values are `no-cache` and `s3`.
   * - build_role
     - string
     - No
     - Handel-created role
     - The role that will be assigned to the CodeBuild project. This role must already exist in your account and must be assumable by CodeBuild.
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

.. NOTE::

  If you use `extra_resources` together with a custom `build_role`, you are responsible for making sure that your custom build role allows access to the extra resources that are created.

Environment Variable Prefix
***************************

Your extra resources will be exposed to your build as environment variables.

The naming of these environment matches that used by `Handel <https://handel.readthedocs.io/en/latest/handel-basics/consuming-service-dependencies.html#environment-variable-prefix>`_, except that the pipeline name is used instead of the environment name.

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

This is a snippet of a handel-codepipeline.yml file which includes an S3 bucket as an extra resource and a custom IAM role:

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
          build_role: my-custom-codebuild-role
          extra_resources:
            cache_bucket:
              type: s3
              #Everything else, including the name, is optional
        ...