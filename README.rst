==========
URL Shrtnr
==========

This is a URL shortening service designed to be as cost effective as possible
by using serverless technologies.

Architecture
------------

TBA

Setup
-----
Some setup is needed prior to deploying the application.

Domain name
...........
The most important thing is to choose the domain name for the shortening
service.  This should be short, snappy, and hosted in Route 53.  The
application will be deployed at https://dev.<domainname> and
https://<domainname>.
Store the domain name in AWS System Manager Parameter Store as a string
value, under the key `/usrshrtnr/short-domain`.

TLS certificate
...............
The service will be served over https and so will need a certificate to be
available.  You could create or purchase your own certificate, but it far easy
and cheaper to use a free AWS-provisioned certificate.  Use Amazon Certificate
Manager to provision a certificate with a principal subject of <domainname> and
additional subjects of *.<domainname>.  **IMPORTANT** This certificate *must*
be provisioned in the `us-east-1` region (N. Virginia) to be available in
Cloudfront.
Store the certificate ARN in AWS System Manager Parameter Store as a string
value, under the key `/usrshrtnr/ssl-certificate`.