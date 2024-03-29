# send-texts-for-me

> "Never trust a computer you can't throw out a window."
>
> — Steve Wozniak

# What is this?

This experimental app detects your iMessage texts and replies to them on your behalf. Some cool features include: 

- Message sending delay (so it doesn't reply too quick)
- Text processing (to make messages more casual)
- Ability to hold extended in-depth conversations with fixed-size queue context window
- Swap out ChatGPT for a fine-tuned version on your own text messages, so it can talk even more similarly to you!

Please be responsible with usage and receive the informed consent of your friends before deploying!

## Quickstart

### Set up program

1. Install Jared
2. Change Jared config file (located at `~/Library/Application Support/Jared/config.json`) to the `config.json` here
3. Launch Jared
4. Install Node.js (https://nodejs.org)
5. If you don't have it, install yarn using:

```bash
sudo npm i -g yarn
```

6. Open this directory (`cd send-texts-for-me`), then install packages by typing:

```bash
yarn
```

7. Create a new file `.env` and fill in environment variables following the format of `.env.example`. Get your OpenAI API key at platform.openai.com
8. Set up SQL (see below)
9. Run the textbot with:

```bash
yarn dev
```

### Set up SQL

1. Clone the repository
2. Move you `chat.db` file into the repository directory
3. Execute the following from the command line:

```bash
cat query.sql | sqlite3 chat.db -csv -header > output.csv
```

4. Use Google Sheets utility to convert output.csv into the correct format
5. If adding synthetic data, add it in a file `synthetic.csv` in the same format as `output.csv`, and run the following command:

```bash
tail -n+2 -q synthetic.csv >> output.csv
```

### Notes

- under typescript version, self-message conversation exchanges don't work on certain devices (depending on how iMessage accounts are configured). If not working, try sending to an associated account not under ths ame contact
