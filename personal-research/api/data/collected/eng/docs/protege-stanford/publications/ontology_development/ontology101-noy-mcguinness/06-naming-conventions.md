# What's in a name?

Defining naming conventions for concepts in an ontology and then strictly adhering to these conventions not only makes the ontology easier to understand but also helps avoid some common modeling mistakes. There are many alternatives in naming concepts. Often there is no particular reason to choose one or another alternative. However, we need to

Define a naming convention for classes and slots and adhere to it.

The following features of a knowledge representation system affect the choice of naming conventions:

- Does the system have the same name space for classes, slots, and instances? That is, does the system allow having a class and a slot with the same name (such as a class winery and a slot winery)?

- Is the system case-sensitive? That is, does the system treat the names that differ only in case as different names (such as Winery and winery)?

- What delimiters does the system allow in the names? That is, can names contain spaces, commas, asterisks, and so on?

Protégé-2000, for example, maintains a single name space for all its frames. It is case-sensitive. Thus, we cannot have a class winery and a slot winery. We can, however, have a class Winery (not the upper-case) and a slot winery. CLASSIC, on the other hand, is not case sensitive and maintains different name spaces for classes, slots, and individuals. Thus, from a system perspective, there is no problem in naming both a class and a slot Winery.

## 6.1 Capitalization and delimiters

First, we can greatly improve the readability of an ontology if we use consistent capitalization for concept names. For example, it is common to capitalize class names and use lower case for slot names (assuming the system is case-sensitive). 

When a concept name contains more than one word (such as Meal course) we need to delimit the words. Here are some possible choices.

 Use Space: Meal course (many systems, including Protégé, allow spaces in concept names). 

 Run the words together and capitalize each new word: MealCourse 

 Use an underscore or dash or other delimiter in the name: Meal\_Course*,* Meal\_course*,* Meal-Course*,* Meal-course. (If you use delimiters, you will also need to decide whether or not each new word is capitalized)

If the knowledge-representation system allows spaces in names, using them may be the most intuitive solution for many ontology developers. It is however, important to consider other systems with which your system may interact. If those systems do not use spaces or if your presentation medium does not handle spaces well, it can be useful to use another method.

## 6.2 Singular or plural

A class name represents a collection of objects. For example, a class Wine actually represents all wines. Therefore, it could be more natural for some designers to call the class Wines rather than Wine. No alternative is better or worse than the other (although singular for class names is used more often in practice). However, whatever the choice, it should be consistent throughout the whole ontology. Some systems even require their users to declare in advance whether or not they are going to use singular or plural for concept names and do not allow them to stray from that choice. 

Using the same form all the time also prevents a designer from making such modeling mistakes as creating a class Wines and then creating a class Wine as its subclass (see [Section 4.1](#Section41)).

## 6.3 Prefix and suffix conventions

Some knowledge-base methodologies suggest using prefix and suffix conventions in the names to distinguish between classes and slots. Two common practices are to add a has- or a suffix –of to slot names. Thus, our slots become has-maker and has-winery if we chose the has- convention. The slots become maker-of and winery-of if we chose the of- convention. This approach allows anyone looking at a term to determine immediately if the term is a class or a slot. However, the term names become slightly longer. 

## 6.4 Other naming considerations

Here are a few more things to consider when defining naming conventions:

- Do not add strings such as “class”, “property”, “slot”, and so on to concept names.

It is always clear from the context whether the concept is a class or a slot, for example. In addition if you use different naming conventions for classes and slots (say, capitalization and no capitalization respectively), the name itself would be indicative of what the concept is.

- It is usually a good idea to avoid abbreviations in concept names (that is, use Cabernet Sauvignon rather than Cab)

- Names of direct subclasses of a class should either all include or not include the name of the superclass. For example, if we are creating two subclasses of the Wine class to represent red and white wines, the two subclass names should be either Red Wine and White Wine or Red and White, but not Red Wine and White.

---

*Archived from Stanford / Protégé publication for research. The source URL is authoritative if content diverges.*
