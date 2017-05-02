Introduction
============
Handel-CodePipeline is a command-line library that helps you create Continuous Delivery pipelines using the `Handel deployment library <https://handel.readthedocs.io>`_, running inside the AWS CodePipeline service. You can wire up these pipelines manually if you choose, but this library simplifies the process of setting up your pipeline.

How does this library work?
---------------------------
You specify a file called *handel-codepipeline.yml* in your code repository. This file contains a YAML specification of how the library should configure your pipeline.

In addition to this pipeline specification file, you'll also need to specify your `Handel file <https://handel.readthedocs.io>`_ that defines how your application should be deployed. Handel-CodePipeline needs to read this to get information about your environment file.

Once you've defined your specification, you can run the library. It will prompt you for further pieces of information, after which it will create the pipeline.