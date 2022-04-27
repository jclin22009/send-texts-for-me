WITH grouped_messages AS (
WITH individual_messages AS (
-- Get all messages, ordered by person and then date
SELECT
    ROW_NUMBER() OVER (ORDER BY chat.chat_identifier, message_date) AS id,
    message.text,
    chat.chat_identifier,
    message_date,
    message.is_from_me
FROM
    chat
    JOIN chat_message_join ON chat. "ROWID" = chat_message_join.chat_id
    JOIN message ON chat_message_join.message_id = message. "ROWID"
WHERE
	chat.chat_identifier LIKE '+%'
-- Optional: Filter to one specific conversation
-- AND
-- 	chat.chat_identifier = '[NUMBER]'
ORDER BY
    chat.chat_identifier, message_date
)
-- Group adjacent texts from the same person together, and concatenate:
-- https://stackoverflow.com/questions/47170928/group-by-adjacent-records
SELECT ROW_NUMBER() over (order by person, min(Somedate)) as id, person, GROUP_CONCAT(text, '|') as content, is_from_me FROM
(
SELECT  a.chat_identifier as person, b.text as text, b.is_from_me, b.message_date AS Somedate, Min(a.message_date) AS Nextdate, a.is_from_me as n
 FROM individual_messages a JOIN individual_messages b
 ON a.message_date > b.message_date AND a.chat_identifier = b.chat_identifier
 WHERE a.is_from_me <> b.is_from_me
 GROUP BY person, b.message_date
 ) s1
GROUP BY is_from_me, Nextdate
ORDER BY person, Min(Somedate) asc
)
-- Make prompt/completion pairs
SELECT pr.content as 'prompt', com.content as 'completion' FROM grouped_messages pr
JOIN grouped_messages com
WHERE pr.id + 1 = com.id
AND NOT pr.is_from_me
AND com.is_from_me
AND pr.person = com.person
AND (length(pr.content) != 1 OR unicode(pr.content) != 65532)
AND unicode(com.content) != 65532
AND NOT (
pr.content LIKE 'Loved%'
OR pr.content LIKE '%|Loved%'
OR com.content LIKE 'Loved%'
OR com.content LIKE '%|Loved%'
OR pr.content LIKE 'Liked%'
OR pr.content LIKE '%|Liked%'
OR com.content LIKE 'Liked%'
OR com.content LIKE '%|Liked%'
OR pr.content LIKE 'Disliked%'
OR pr.content LIKE '%|Disliked%'
OR com.content LIKE 'Disliked%'
OR com.content LIKE '%|Disliked%'
OR pr.content LIKE 'Laughed at%'
OR pr.content LIKE '%|Laughed at%'
OR com.content LIKE 'Laughed at%'
OR com.content LIKE '%|Laughed at%'
OR pr.content LIKE 'Emphasized%'
OR pr.content LIKE '%|Emphasized%'
OR com.content LIKE 'Emphasized%'
OR com.content LIKE '%|Emphasized%'
OR pr.content LIKE 'Questioned%'
OR pr.content LIKE '%|Questioned%'
OR com.content LIKE 'Questioned%'
OR com.content LIKE '%|Questioned%'
) 
