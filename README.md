# send-texts-for-me

> "Never trust a computer you can't throw out a window."
> 
> — Steve Wozniak

## TODO
### priority
- [ ] Add a way to send messages to groups. NOTE: either need to use webhook or add participants to REST API call. https://github.com/ZekeSnider/Jared/issues/58

- [ ] Add name awareness (running into bug where `name:` is printed at end of message)

- [ ] build personal message dataset and fine tune

### medium
- [ ] Append messages rapidly sent to me in succession into a single message/API call

- [ ] refine stop sequencing so it can stop a conversation

- [ ] shouldn't respond to text message reactions

- [ ] multiple conversations seem to blend into one, making the model confused -- implement user parameter?

- [ ] shouldn't respond to just images

### min
- [ ] make terminal output pretty

## Quickstart

### Set up program

1. Install Jared
2. Change Jared config file (located at `~/Library/Application Support/Jared/config.json`) to the `config.json` here
3. Activate virtual environment
4. Add API key to your env
5. Set up SQL
6. Run server
7. Run textbot and enjoy

### Set up SQL

1. Clone the repository
2. Move you `chat.db` file into the repository directory
3. Execute the following from the command line:

```bash
cat query.sql | sqlite3 chat.db -csv -header > output.csv
```
