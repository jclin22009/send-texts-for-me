import requests
import os
import openai

'''
Send iMessage message with Jared. Jared also allows you to attach things
but I'm too lazy to implement that
'''
def send_message(message, recipient_id):
    r = requests.post("http://localhost:3000/message",json={"body": {"message": message}, "recipient": {"handle": recipient_id}})
    print(r.text)

def initialize_gpt():
    openai.api_key = os.environ.get('API_KEY') 

def get_gpt_response(message):
    response = openai.Completion.create(engine="davinci", prompt=message)
    return response.choices[0]['text']
    
if __name__ == '__main__':
    send_message("this be working", "jclin2.2009@gmail.com")
    # print("Welcome to the GPT experience!")
    # initialize_gpt()
    # while True:
    #     message = input()
    #     if message == '':
    #         break
    #     response = get_gpt_response(message)
    #     print(response)