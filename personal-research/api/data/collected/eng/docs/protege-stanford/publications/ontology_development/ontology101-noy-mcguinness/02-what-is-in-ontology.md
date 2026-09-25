# What is in an ontology?

The Artificial-Intelligence literature contains many definitions of an ontology; many of these contradict one another. For the purposes of this guide an **ontology** is a formal explicit description of concepts in a domain of discourse (**classes** (sometimes called **concepts**)), properties of each concept describing various features and attributes of the concept (**slots** (sometimes called **roles** or **properties**)), and restrictions on slots (**facets** (sometimes called **role restrictions**)). An ontology together with a set of individual **instances** of classes constitutes a **knowledge base**. In reality, there is a fine line where the ontology ends and the knowledge base begins.

Classes are the focus of most ontologies. Classes describe concepts in the domain. For example, a class of wines represents all wines. Specific wines are instances of this class. The Bordeaux wine in the glass in front of you while you read this document is an instance of the class of Bordeaux wines. A class can have **subclasses** that represent concepts that are more specific than the superclass. For example, we can divide the class of all wines into red, white, and rosé wines. Alternatively, we can divide a class of all wines into sparkling and non-sparkling wines. 

Slotsdescribe properties of classes and instances: Château Lafite Rothschild Pauillac wine has a full body; it is produced by the Château Lafite Rothschild winery. We have two slots describing the wine in this example: the slot body with the value full and the slot maker with the value Château Lafite Rothschild winery. At the class level, we can say that instances of the class Wine will have slots describing their flavor, body, sugar level, the maker of the wine and so on.[\[1\]](#_footnote1)

All instances of the class Wine, and its subclass Pauillac, have a slot maker the value of which is an instance of the class Winery ([Figure 1](#Figure1)). All instances of the class Winery have a slot produces that refers to all the wines (instances of the class Wine and its subclasses) that the winery produces.

In practical terms, developing an ontology includes: 

 defining classes in the ontology, 

 arranging the classes in a taxonomic (subclass–superclass) hierarchy, 

 defining slots and describing allowed values for these slots, 

 filling in the values for slots for instances. 

We can then create a knowledge base by defining individual instances of these classes filling in specific slot value information and additional slot restrictions. 

![image002.jpg](https://protege.stanford.edu/publications/ontology_development/image002.jpg)

Figure 1. Some classes, instances, and relations among them in the wine domain. We used black for classes and red for instances. Direct links represent slots and internal links such as instance-of and subclass-of.

---

*Archived from Stanford / Protégé publication for research. The source URL is authoritative if content diverges.*
