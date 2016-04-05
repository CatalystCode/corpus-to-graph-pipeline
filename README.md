# Azure Pipeline
A pipeline that processes documents from a public repository, 
performs entity extraction + scoring on them and outputs the data into a database in the form of entity-relation graph.

# Solution Architecture
![Architecture Diagram](docs/architecture.png "Solution Architecture")

The elements in play in this solution are as follows:

| Element           | Description                           |
| ----------------- | ------------------------------------- |
|Public Repository  | External repository that supplies new documents every day
|Trigger Web Job    | Scheduled to run daily and trigger a flow
|Query Web Job      | Queries for new document IDs (latest)
|Parser Web Job     | Divides documents into sentences and entities
|Scoring Web Job    | Scores sentences and relations
|External API       | API (url) that enables entity extraction and scoring
|Graph Data         | Database to store documents, sentences and relations 

# Web Jobs
There are 3 web jobs in the bundle

| Web Job      | Description                           |
| ------------ | ------------------------------------- |
|__Trigger__   |A schedules web job that triggers a daily check for new document Ids
|__Query__     |Query documents according to date range provided through <br>*Trigger Queue* and insert all unprocessed documents to *New IDs Queue*
|__Parser__    |Processes each document in *New IDs Queue* into <br>sentences and entities and pushes them into *Scoring Queue*
|__Scoring__   |Scores each sentence in *Scoring Queue* via the *Scoring Service*

To get more information on the message api between the web jobs and the queues see [Azure Pipeline - Message API](docs/queues.md)

# Testing
Initiate tests by running:
```
npm install
npm test
```

The test replaces the implementation of **azure sql database** and the **azure storage queue** with stubs.

> In the same way you can replace the implementation of **azure sql database** and the **azure storage queue** with non-azure implementations

# Exmaple
An exmaple on how to use this project for processing a document in a **Genomix** context see [Genomix Pipeline](https://github.com/CatalystCode/genomix-pipeline)

# License
Document Processing Pipeline is licensed under the [MIT License](LICENSE).