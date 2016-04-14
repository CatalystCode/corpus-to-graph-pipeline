# Corpus to Graph Pipeline - Message API
[This document is part of [Corpus to Graph Pipeline](../README.md)]

Corpus to Graph pipeline components

# Trigger New Document ID Check
* Push the following message to the trigger queue to start a new check
```
{
  "requestType": "trigger"
}
```
 
* If you want to specify a date range to check documents, use the following format
```
{
  "requestType": "trigger",
  "data": {
        "from": "2014-02-01",
        "to": "2014-02-14"
    }
}
```

# Getting Documents ID Worker
* Get Ids of new documents from both pmc and pubmed databases
* Filter new Ids using filtering stored procedure
* Push all Ids to queue

```
{
  "requestType": "getDocument",
  "data": {
        "docId": "docId",
        "sourceId": "pmc"
    }
}
```

# Fetching documents Worker
* Get item from queue
* Insert document record to db with status processing
* Fetch document
* Split to sentences, do some processing
* push sentences to scoring queue

```
{
  "requestType": "score",
  "data": {
    "sourceId": 1,
    "docId": "docId",
    "sentenceIndex": 1,
    "modelVersion": "0.1.0.1",
    "sentence": "the sentence text...",
    "relations": [
      {
        "entity1": {
          "typeId": 2,
          "name": "mirnaX"
        },
        "entity2": {
          "typeId": 1,
          "name": "geneY"
        },
        "relation": 2,
        "classification": 0.56
      },
      {
        "entity1": {
          "typeId": 2,
          "name": "mirnaX1"
        },
        "entity2": {
          "typeId": 1,
          "name": "geneY1"
        },
        "relation": 2,
        "classification": 0.26
      },
      {
        "entity1": {
          "typeId": 2,
          "name": "mirnaX2"
        },
        "entity2": {
          "typeId": 1,
          "name": "geneY2"
        },
        "relation": 3,
        "classification": 0.50
      }
    ]
  }
}
```

* Change document status to 'scoring'
* Delete item from queue

# Scoring Worker
1.	Get items from scoring queue
2.	Score and insert sentences to DB
3.	Delete items from queue
4.	Update document status to 'processed'
