GitHub
======
The *GitHub* phase type configures a pipeline phase to pull source code from GitHub. The pipeline is launched when code is pushed to GitHub on the specified branch. The first phase of every pipeline created with Handel-CodePipeline must be a source code phase such as this GitHub type. 

Parameters
----------

.. list-table::
   :header-rows: 1

   * - Parameter
     - Type
     - Required
     - Default
     - Description
   * - owner
     - string
     - Yes
     - 
     - The GitHub username or organization where the repository lives.
   * - repo 
     - string
     - Yes
     - 
     - The name of the GitHub repository containing the source code that will build and deploy in the pipeline.
   * - branch
     - string
     - No
     - master
     - The name of the Git branch in the repository from which the pipeline will be invoked.

Secrets
-------
In addition to the parameters specified in your handel-codepipeline.yml file, this phase will prompt you for the following secret information when creating your pipeline:

* GitHub personal access token.

This is not saved in your handel-codepipeline.yml file because by having the token others can interact with GitHub on your behalf.


Example Phase Configuration
---------------------------
This snippet of a handel-codepipeline.yml file shows the GitHub phase being configured:

.. code-block:: yaml
    
    version: 1

    pipelines:
      dev:
        phases:
        - type: github
          name: GitHub
          owner: byu-oit-appdev
          repo: aws-credential-detector
          branch: master
        ...
