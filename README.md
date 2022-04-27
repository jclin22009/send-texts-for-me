# send-texts-for-me

> In the future, we will not text friends with our computers. Our computers will text our friends for us.
> 
> — Aristotle

## Quickstart

### Set up program
1. Install Jared
2. Change Jared config file (located at `~/Library/Application Support/Jared/config.json`) to the `config.json` here
3. Activate virtual environment
4. Set up SQL
5. Run server
6. Run textbot and enjoy

### Set up SQL

1. Clone the repository
2. Move you `chat.db` file into the repository directory
3. Execute the following from the command line:

```bash
cat query.sql | sqlite3 chat.db -csv -header > output.csv
```
