Invoke Lambda
=============
The *Invoke Lambda* phase type configures a pipeline phase to execute an arbitrary Lambda function in your account.

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
     - invoke_lambda
     - This must always be *invoke_lambda* for the Invoke Lambda phase type.
   * - name
     - string
     - Yes
     -
     - The value you want to show up in the CodePipeline UI as your phase name.
   * - function_name
     - string
     - Yes
     - 
     - The name of the Lambda function you wish to invoke in this phase.
   * - function_parameters
     - map<string, string>
     - No 
     - 
     - An object of parameter values to pass into the Lambda function.

Secrets
-------
This phase type doesn't prompt for any secrets when creating the pipeline.

Example Phase Configuration
---------------------------
This snippet of a handel-codepipeline.yml file shows the GitHub phase being configured:

.. code-block:: yaml
    
    version: 1

    pipelines:
      dev:
        ...
        phases:
        - type: invoke_lambda
          name: InvokeMyFunction
          function_name: my_function_name_to_invoke
          function_parameters:
            myParam1: hello
            myParam2: world
        ...
