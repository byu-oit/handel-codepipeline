Introduction
============
Handel-CodePipeline is a command-line library that helps you create Continuous Delivery pipelines using the `Handel deployment library <https://handel.readthedocs.io>`_, running inside the AWS CodePipeline service. You can wire up these pipelines manually if you choose, but this library simplifies the process of setting up your pipeline.

How does this library work?
---------------------------
You specify a file called *handel-codepipeline.yml* in your code repository. This file contains a YAML specification of how the library should configure your pipeline.

Once you've defined your *handel-codepipeline.yml* file, you can run the library. It will prompt you for further pieces of information, after which it will create the pipeline.