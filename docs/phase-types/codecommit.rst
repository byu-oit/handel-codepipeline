CodeCommit
==========
The *CodeCommit* phase type configures a pipeline phase to pull source code from CodeCommit. The pipeline is launched when code is pushed to CodeCommit on the specified branch. The first phase of every pipeline created with Handel-CodePipeline must be a source code phase such as this CodeCommit type. 

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
     - codecommit
     - This must always be *codecommit* for the CodeCommit phase type.
   * - name
     - string
     - Yes
     -
     - The value you want to show up in the CodePipeline UI as your phase name.
   * - repo 
     - string
     - Yes
     - 
     - The name of the CodeCommit repository containing the source code that will build and deploy in the pipeline.
   * - branch
     - string
     - No
     - master
     - The name of the Git branch in the repository from which the pipeline will be invoked.

Secrets
-------
This phase type doesn't prompt for any secrets when creating the pipeline.


Example Phase Configuration
---------------------------
This snippet of a handel-codepipeline.yml file shows the CodeCommit phase being configured:

.. code-block:: yaml
    
    version: 1

    pipelines:
      dev:
        phases:
        - type: codecommit
          name: Source
          owner: byu-oit-appdev
          repo: aws-credential-detector
          branch: master
        ...
