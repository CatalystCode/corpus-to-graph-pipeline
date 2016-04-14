# Corpus to Graph Pipeline
Corpus to Graph pipeline is a module that processes documents from a public repository (corpus), 
performs entity extraction + scoring on them and outputs the data into a database in the form of entity-relation graph.

# Solution Architecture
![Architecture Diagram](docs/images/architecture.png "Solution Architecture")

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
|__Trigger__   |A scheduled web job that triggers a daily check for new document Ids
|__Query__     |Queries documents according to date range provided through <br>*Trigger Queue* and insert all unprocessed documents to *New IDs Queue*
|__Parser__    |Processes each document in *New IDs Queue* into <br>sentences and entities and pushes them into *Scoring Queue*
|__Scoring__   |Scores each sentence in the *Scoring Queue* via the *Scoring Service*

To get more information on the message api between the web jobs and the queues see [Corpus to Graph Pipeline - Message API](docs/queues.md)

# Pipeline Logic Interface
If you have a document repository and you'd like to run it through the corpus to graph pipeline you will need to provide an implementation of the following **pipeline logic interface**:

[pipeline-logic-interface.js](lib\proxy\pipeline-logic-interface.js):
1. getNewUnprocessedDocumentIDs - Retrieves IDs of unprocessed documents in the following format:
```json
var documents = [
  {
    sourceId: 1,
    docId: '85500001'
  },
  {
    sourceId: 2,
    docId: '90800001'
  }
];
``` 
2. getDocumentSentences - Gets an array of sentences in following format (you can also provide entities alongside the sentences):
```
var sentencesArray = {
  "sentences": [
    {
      "sentence": "This is a sentence about entity-1 and entity-2.",
      "mentions": [
        {
          "from": "25", 
          "to": "32", 
          "id": "1234", 
          "type": "entityType1", 
          "value": "entity-1"
        }, 
        {
          "from": "38", 
          "to": "45", 
          "id": "ABCD", 
          "type": "entityType2", 
          "value": "entity-2"
        }
      ]
    }, 
    {
      "sentence": "This sentence also contains entity-1 and entity-2.",
      "mentions": []
    }
  ]
};
```
3. getSentenceEntities - Gets the entities array for a retrieved sentence
> You can implement the methods **getSentenceEntities** and **getDocumentSentences** separately, or use getDocumentSentences to get both sentences and entities (as is done in the stub).

4. getScoring - Scores a sentence with mentions and return the score in the following format:
```
var result = {
  entities: [
    {
      id: "1234",
      name: "entity-1",
      typeId: 1
    },
    {
      id: "ABCD",
      name: "entity-2",
      typeId: 2
    }
  ],
  relations: [
    {
      entity1: {
        id: "1234",
        name: "entity-1",
        typeId: 1
      },
      entity2: {
        id: "ABCD",
        name: "entity-2",
        typeId: 2
      },
      modelVersion: "0.1.0.1",
      relation: 2,
      score: 0.8,
      scoringServiceId: "SERVICE1"
    }
  ]
};
```

You have an example on how to implement this interface here: [Pipeline Logic Stub](test/stub-modules/pipeline-logic.js "Pipeline Logic Stub")

# Testing
Initiate tests by running:
```
npm install
npm test
```

The test replaces the implementation of **azure sql database** and the **azure storage queue** with stubs.

> In the same way you can replace the implementation of **azure sql database** and the **azure storage queue** with non-azure implementations

# Example
An example on how to use this project for processing a document in a **Genomics** context see [Corpus to Graph Genomics](https://github.com/CatalystCode/corpus-to-graph-genomics)

# License
Document Processing Pipeline is licensed under the [MIT License](LICENSE).
