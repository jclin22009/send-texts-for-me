# send-texts-for-me
amogus? 

## Components

### Messages Database

`~/Library/Messages/chat.db`

### iMessage Sending Library

https://github.com/Rolstenhouse/py-iMessage

### OpenAPI

OpenAI API

### Getting Started

1. Clone the repository
2. Move you `chat.db` file into the repository directory
3. Execute the following from the command line:

```bash
cat query.sql | sqlite3 chat.db -csv -header > output.csv
```
