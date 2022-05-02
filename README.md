# send-texts-for-me

> "Never trust a computer you can't throw out a window."
>
> — Steve Wozniak

## TODO

### priority

- [ ] build personal message dataset and fine tune

### medium

- [x] Append messages rapidly sent to me in succession into a single message/API call

- [ ] Add name awareness (running into bug where `name:` is printed at end of message)

- [x] refine stop sequencing so it can stop a conversation

- [x] shouldn't respond to text message reactions

- [x] for each session, initialize a dictionary with the conversation thus far. Feed in this dictionary as a string into GPT each time, so that the bot is contextually aware. Hazard: ensure dictionary string size is below token limit (unlikely to exceed)

- [x] sentences delimited by period are sent as separate messages

- [x] shouldn't respond to when only an image is sent

### min

- [x] make terminal output pretty

- [ ] Add a way to send messages to groups. NOTE: either need to use webhook or add participants to REST API call. <https://github.com/ZekeSnider/Jared/issues/58>

## Quickstart

### Set up program

1. Install Jared
2. Change Jared config file (located at `~/Library/Application Support/Jared/config.json`) to the `config.json` here
3. Launch Jared
4. Install Node.js (https://nodejs.org)
5. Install yarn using:

```bash
sudo npm i -g yarn
```

6. Install packages by typing:

```bash
yarn
```

7. Create a new file `.env` and fill in environment variables following the format of `.env.example`
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
