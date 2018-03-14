# Spaces Contribution Guide

Contributing to the ThreatConnect Spaces Github repository is a powerful and scalable way to make a positive impact to the infosec community. At ThreatConnect, we believe that Threat Intelligence can have a visible impact on your company’s success, and that Spaces can help ensure that analysts are presented with the right information in the right spaces.

## Contributing Spaces

Spaces are stored in ThreatConnect-installable ZIP files, which allows them to be easily shared between instances of ThreatConnect.

In order to contribute a Spaces App, create a Pull request. To use the Spaces App in your instance, click the “Install App (+)” button in TC Exchange Settings (requires system administrator).

## Contribution Best Practices

**Give your Spaces App a descriptive name.** There may be dozens of Spaces Apps in an instance of ThreatConnect, so it's important that the name is notable and references key functions and/or integrations. For example, "Triage" is bad, "Email Triage" is better, "VirusTotal Email Triage" is awesome, and "VirusTotal Email Triage & Detonation - Host, Address, and Mutex Ingestion" is best.

**Include a description in the Spaces App.** Just like commenting in code, this helps other users better understand the purpose of your contribution and how to use it most effectively in their environment.

**Make it clear whether the Spaces App is intended to be contextually aware.** If your Spaces App is intended to be used with a particular data object (such as an Address or an Incident), make it clear in the title and/or description.

**Spaces Apps should be named with a prefix designating their type:**
+ TCX = Context Aware
+ TCS = Standard Spaces
+ TCM = Menu

If you have any feedback, please open an Issue in this repo. For general questions, please contact support@threatconnect.com.
