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