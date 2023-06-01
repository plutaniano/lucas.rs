---
pubDatetime: 2023-04-06T00:01:00Z
title: Digging for TOTPs
featured: true
tags:
  - totp
description: Extracting a TOTP secret from an authenticator app
---


## Background

I currently work in the financial sector as a software engineer. My company is in the business of investment advisory. Clients open accounts with us so we can manage their investments for them.

Due to a variety of reasons, we don't actually "own" the infrastructure needed to trade stocks, bonds, derivatives and other financial products. We partner with a broker to do that for us. This is all legal and regulated by the Brazilian authorities.

This broker provides us with a website where we can manage all of our clients accounts. Pretty much everything that involves buying and selling financial products goes through this website.

To login into this website we need a username, a password and a Time-based One Time Password (TOTP), also known as Two-factor Authentication.

The username and password are your standard username and password, nothing unusual about those. The TOTPs, on the other hand, are only provided through a iOS/Android app that is also provided by that broker. You can't use a 3rd party app like [Authy](https://authy.com), because they don't expose the secret key needed to generate the 6-digit TOTPs that we need to log into the website.

That's where my pains started.

## Automation

I had just moved to a new team inside the company, and a big part of my new role included writing data scraping routines to extract data from our partner's website.

(Technically speaking, we're not allowed to do this. Our agreement with the broker explicitly prohibits us from building any kind of automation on top of their systems, but the efficiency gains are so huge that it's simply impossible to even consider doing all of these processes manually.)

All of these automation routines that I was beginning to write needed to be manually fed the 6-digit TOTP or else they could not authenticate to the website. I asked the rest of the team if they had tried to find a way to automate this step. They said no, but not because they didn't want to, they just didn't even know where to start.

So I set out to change it.

## Digging

After playing around with the app for a bit, I could immediately tell one thing: the app worked without an internet connection. That meant that the secret key MUST be somewhere inside the app's files.

From the get go I knew I needed some way to run the app in an environment I could have full access to its files. I first thought about a jailbroken iPhone, I have some past experience in that area, but I currently have an iPhone 14, which is currently not jailbreakable. Luckily I also have a M1 Macbook Air, which is capable of natively running iPhone apps. So I went to the App Store on my mac and downloaded the app.

After setting everything up I ran `lsof -p $(pgrep Authenticator)` to see which file descriptors were being used by the app. The list was pretty big, it had more than 50 currently open files. I checked all the files that seemed like they could store a secret key, but no luck. It seems like the app loads the secret key at startup and then closes the file.

After that, I tried looking at all of the app's files, which were located at `/User/lucas/Library/Containers/<uuid>/Data/`, where the uuid is unique to each app that is installed in the system. Running `ls | wc -l` yielded 30, so I started opening all 30 directories, looking for anything that could store the secret key.

Fortunately, one of the first directories I look into was the `Caches` directory, which contained a file called `Cache.db`. Having used sqlite before, I immediately knew that that file was a sqlite database. Running `file Cache.db` confirmed my suspicions.

So I connected to it using `sqlite3 Cache.db`, checked which tables existed with `.tables` and tried running a `SELECT * FROM {table}` on all three of them.

On the third table, called `cfurl_cache_receiver_data` I got the following result:

```bash
sqlite> SELECT * FROM cfurl_cache_receiver_data;
1|0|J5BGS3B61E5FMOKBM4ASSLD8PNA9OU4F
```

Bingo! I immediately recognized the base32 encoding, the encoding used by the TOTP algorithm.

I opened a python shell and ran:

```python
In [1]: import pyotp

In [2]: totp = pyotp.TOTP("J5BGSSB6EE5FMOKSMZASSZDNPNAVOUSF")

In [3]: totp.now()
Out[3]: '003371'
```

The number matched the one I had on the app. Challenged completed!
