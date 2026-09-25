# Defining classes and a class hierarchy

This section discussed things to look out for and errors that are easy to make when defining classes and a class hierarchy ([Step 4](#Step4) from [Section 3](#Section3)). As we have mentioned before, there is no single correct class hierarchy for any given domain. The hierarchy depends on the possible uses of the ontology, the level of the detail that is necessary for the application, personal preferences, and sometimes requirements for compatibility with other models. However, we discuss several guidelines to keep in mind when developing a class hierarchy. After defining a considerable number of new classes, it is helpful to stand back and check if the emerging hierarchy conforms to these guidelines.

## 4.1 Ensuring that the class hierarchy is correct

#### An “is-a” relation

The class hierarchy represents an “is-a” relation: a class A is a subclass of B if every instance of B is also an instance of A. For example, Chardonnay is a subclass of White wine. Another way to think of the taxonomic relation is as a “kind-of” relation: Chardonnay is a kind of White wine. A jetliner is a kind of an aircraft. Meat is a kind of food. 

A subclass of a class represents a concept that is a “kind of” the concept that the superclass represents.

#### A single wine is not a subclass of all wines

A common modeling mistake is to include both a singular and a plural version of the same concept in the hierarchy making the former a subclass of the latter. For example, it is wrong to define a class Wines and a class Wine as a subclass of Wines. Once you think of the hierarchy as representing the “kind-of” relationship, the modeling error becomes clear: a single Wine is not a **kind of** Wines. The best way to avoid such an error is always to use either singular or plural in naming classes (see [Section 6](#Section6) for the discussion on naming concepts). 

#### Transitivity of the hierarchical relations

A subclass relationship is transitive:

If B is a subclass of A and C is a subclass of B, then C is a subclass of A

For example, we can define a class Wine, and then define a class White wine as a subclass of Wine. Then we define a class Chardonnay as a subclass of White wine. Transitivity of the subclass relationship means that the class Chardonnay is also a subclass of Wine. Sometimes we distinguish between direct subclasses and indirect subclasses. A **direct subclass** is the “closest” subclass of the class: there are no classes between a class and its direct subclass in a hierarchy. That is, there are no other classes in the hierarchy between a class and its direct superclass. In our example, Chardonnay is a direct subclass of White wine and is not a direct subclass of Wine.

#### Evolution of a class hierarchy

Maintaining a consistent class hierarchy may become challenging as domains evolve. For example, for many years, all Zinfandel wines were red. Therefore, we define a class of Zinfandel wines as a subclass of the Red wine class. Sometimes, however, wine makers began to press the grapes and to take away the color-producing aspects of the grapes immediately, thereby modifying the color of the resulting wine. Thus, we get “white zinfandel” whose color is rose. Now we need to break the Zinfandel class into two classes of zinfandel—White zinfandel and Red zinfandel—and classify them as subclasses of Rose wine and Red wine respectively. 

#### Classes and their names

It is important to distinguish between a class and its name:

Classes represent concepts in the domain and not the words that denote these concepts.

The name of a class may change if we choose a different terminology, but the term itself represents the objective reality in the world. For example, we may create a class Shrimps, and then rename it to Prawns—the class still represents the same concept. Appropriate wine combinations that referred to shrimp dishes should refer to prawn dishes. In more practical terms, the following rule should always be followed:

Synonyms for the same concept do not represent different classes

Synonyms are just different names for a concept or a term. Therefore, we should **not** have a class called Shrimp and a class called Prawn, and, possibly a class called Crevette. Rather, there is one class, named either Shrimp or Prawn. Many systems allow associating a list of synonyms, translations, or presentation names with a class. If a system does not allow this associations, synonyms could always be listed in the class documentation.

#### Avoiding class cycles

We should avoid **cycles** in the class hierarchy. We say that there is a cycle in a hierarchy when some class A has a subclass B and at the same time B is a superclass of A. Creating such a cycle in a hierarchy amounts to declaring that the classes A and B are equivalent: all instances of A are instances of B and all instances of B are also instances of A. Indeed, since B is a subclass of A, all B’s instances must be instances of the class A. Since A is a subclass of B, all A’s instances must also be instances of the class B.

## 4.2 Analyzing siblings in a class hierarchy

#### Siblings in a class hierarchy

**Siblings** in the hierarchy are classes that are direct subclasses of the same class (see [Section 4.1](#Section41)).

All the siblings in the hierarchy (except for the ones at the root) must be at the same level of generality.

For example, White wine and Chardonnay should not be subclasses of the same class (say, Wine). White wine is a more general concept than Chardonnay. Siblings should represent concepts that fall “along the same line” in the same way that same-level sections in a book are at the same level of generality. In that sense, requirements for a class hierarchy are similar to the requirements for a book outline.

The concepts at the root of the hierarchy however (which are often represented as direct subclasses of some very general class, such as Thing) represent major divisions of the domain and do not have to be similar concepts.

#### How many is too many and how few is too few?

There are no hard rules for the number of direct subclasses that a class should have. However, many well structured ontologies have between two and a dozen direct subclasses. Therefore, the following two guidelines:

If a class has only one direct subclass there may be a modeling problem or the ontology is not complete.

If there are more than a dozen subclasses for a given class then additional intermediate categories may be necessary. 

The first of the two rules is similar to a typesetting rule that bulleted lists should never have only one bullet point. For example, most of the red Burgundy wines are Côtes d’Or wines. Suppose we wanted to represent only this majority type of Burgundy wines. We could create a class Red Burgundy and then a single subclass Cotes d’Or ([Figure 6a](#Figure6)). However, if in our representation red Burgundy and Côtes d’Or wines are essentially equivalent (all red Burgundy wines are Côtes d’Or wines and all Côtes d’Or wines are red Burgundy wines), creating the Cotes d’Or class is not necessary and does not add any new information to the representation. If we were to include Côtes Chalonnaise wines, which are cheaper Burgundy wines from the region just South of Côtes d’Or, then we will create two subclasses of the Burgundy class: Cotes d’Or and Cotes Chalonnaise ([Figure 6b](#Figure6)). 

![image012.gif](https://protege.stanford.edu/publications/ontology_development/image012.gif)

Figure 6. Subclasses of the Red Burgundy class. Having a single subclass of a class usually points to a problem in modeling.

Suppose now that we list all types of wines as direct subclasses of the Wine class. This list would then include such more general types of wine as Beaujolais and Bordeaux, as well as more specific types such as Paulliac and Margaux ([Figure 7a](#Figure7)). The class Wine has too many direct subclasses and, indeed, for the ontology to reflect the different types of wine in a more organized manner, Medoc should be a subclass of Bordeaux and Cotes d’Or should be a subclass of Burgundy. Also having such intermediate categories as Red wine and White wine would also reflect the conceptual model of the domain of wines that many people have ([Figure 7b](#Figure7)). 

However, if no natural classes exist to group concepts in the long list of siblings, there is no need to create artificial classes—just leave the classes the way they are. After all, the ontology is a reflection of the real world, and if no categorization exists in the real world, then the ontology should reflect that. 

![image014.gif](https://protege.stanford.edu/publications/ontology_development/image014.gif)

Figure 7. Categorizing wines. Having all the wines and types of wine versus having several levels of categorization.

## 4.3 Multiple inheritance

Most knowledge-representation systems allow **multiple inheritance** in the class hierarchy: a class can be a subclass of several classes. Suppose we would like to create a separate class of dessert wines, the Dessert wine class. The Port wine is both a red wine and a dessert wine.[\[4\]](#_footnote4) Therefore, we define a class Port to have two superclasses: Red wine and Dessert wine. All instances of the Port class will be instances of both the Red wine class and the Dessert wine class. The Port class will inherit its slots and their facets from both its parents. Thus, it will inherit the value SWEET for the slot Sugar from the Dessert wine class and the tannin level slot and the value for its color slot from the Red wine class.

## 4.4 When to introduce a new class (or not)

One of the hardest decisions to make during modeling is when to introduce a new class or when to represent a distinction through different property values. It is hard to navigate both an extremely nested hierarchy with many extraneous classes and a very flat hierarchy that has too few classes with too much information encoded in slots. Finding the appropriate balance though is not easy.

There are several rules of thumb that help decide when to introduce new classes in a hierarchy.

Subclasses of a class usually (1) have additional properties that the superclass does not have, or (2) restrictions different from those of the superclass, or (3) participate in different relationships than the superclasses 

Red wines can have different levels of tannin, whereas this property is not used to describe wines in general. The value for the sugar slot of the Dessert wine is SWEET, whereas it is not true of the superclass of the Dessert Wine class. Pinot Noir wines may go well with seafood whereas other red wines do not. In other words, we introduce a new class in the hierarchy usually only when there is something that we can say about this class that we cannot say about the superclass.

In practical terms, each subclass should either have new slots added to it, or have new slot values defined, or override some facets for the inherited slots. 

However, sometimes it may be useful to create new classes even if they do not introduce any new properties. 

Classes in terminological hierarchies do not have to introduce new properties

For example, some ontologies include large reference hierarchies of common terms used in the domain. For example, an ontology underlying an electronic medical-record system may include a classification of various diseases. This classification may be just that—a hierarchy of terms, without properties (or with the same set of properties). In that case, it is still useful to organize the terms in a hierarchy rather than a flat list because it will (1) allow easier exploration and navigation and (2) enable a doctor to choose easily a level of generality of the term that is appropriate for the situation.

Another reason to introduce new classes without any new properties is to model concepts among which domain experts commonly make a distinction even though we may have decided not to model the distinction itself. Since we use ontologies to facilitate communication among domain experts and between domain experts and knowledge-based systems we would like to reflect the expert’s view of the domain in the ontology. 

Finally, we should not create subclasses of a class for each additional restriction. For example, we introduced the classes Red wine, White wine, and Rose wine because this distinction is a natural one in the wine world. We did not introduce classes for delicate wine, moderate wine, and so on. When defining a class hierarchy, our goal is to strike a balance between creating new classes useful for class organization and creating too many classes.

## 4.5 A new class or a property value?

When modeling a domain, we often need to decide whether to model a specific distinction (such as white, red, or rosé wine) as a property value or as a set of classes again depends on the scope of the domain and the task at hand. 

Do we create a class White wine or do we simply create a class Wine and fill in different values for the slot color? The answer usually lies in the scope that we defined for the ontology. How important the concept of White wine is in our domain? If wines have only marginal importance in the domain and whether or not the wine is white does not have any particular implications for its relations to other objects, then we shouldn’t introduce a separate class for white wines. For a domain model used in a factory producing wine labels, rules for wine labels of any color are the same and the distinction is not very important. Alternatively, for the representation of wine, food, and their appropriate combinations a red wine is very different from a white wine: it is paired with different foods, has different properties, and so on. Similarly, color of wine is important for the wines knowledge base that we may use to determine wine-tasting order. Thus, we create a separate class for White wine.

If the concepts with different slot values become restrictions for different slots in other classes, then we should create a new class for the distinction. Otherwise, we represent the distinction in a slot value.

Similarly, our wine ontology has such classes as Red Merlot and White Merlot, rather than a single class for all Merlot wines: red Merlots and white Merlots are really different wines (made from the same grape) and if we are developing a detailed ontology of wine, this distinction is important.

If a distinction is important in the domain and we think of the objects with different values for the distinction as different kinds of objects, then we should create a new class for the distinction.

Considering potential individual instances of a class may also be helpful in deciding whether or not to introduce a new class.

A class to which an individual instance belongs should not change often.

Usually when we use extrinsic rather than intrinsic properties of concepts to differentiate among classes, instances of those classes will have to migrate often from one class to another. For example, Chilled wine should not be a class in an ontology describing wine bottles in a restaurant. The property chilled should simply be an attribute of wine in a bottle since an instance of Chilled wine can easily cease being an instance of this class and then become an instance of this class again.

Usually numbers, colors, locations are slot values and do not cause the creation of new classes. Wine, however, is a notable exception since the color of the wine is so paramount to the description of wine. 

For another example, consider the human-anatomy ontology. When we represent ribs, do we create a class for each of the “1st left rib”, “2nd left rib”, and so on? Or do we have a class Rib with slots for the order and the lateral position (left-right)?[\[5\]](#_footnote5) If the information about each of the ribs that we represent in the ontology is significantly different, then we should indeed create a class for each of the ribs. That is, if we want to represent details adjacency and location information (which is different for each rib) as well as specific functions that each rib playa and organs it protects, we want the classes. If we are modeling anatomy at a slightly lesser level of generality, and all ribs are very similar as far as our potential applications are concerned (we just talk about which rib is broken on the X-Ray without implications for other parts of the body), we may want to simplify our hierarchy and have just the class Rib, with two slots: lateral position, order.

## 4.6 An instance or a class?

Deciding whether a particular concept is a class in an ontology or an individual instance depends on what the potential applications of the ontology are. Deciding where classes end and individual instances begin starts with deciding what is the lowest level of granularity in the representation. The level of granularity is in turn determined by a potential application of the ontology. In other words, what are the most specific items that are going to be represented in the knowledge base? Going back to the competency questions we identified in [Step 1](#Step1) in Section 3, the most specific concepts that will constitute answers to those questions are very good candidates for individuals in the knowledge base. 

Individual instances are the most specific concepts represented in a knowledge base. 

For example, if we are only going to talk about pairing wine with food we will not be interested in the specific physical bottles of wine. Therefore, such terms as Sterling Vineyards Merlot are probably going to be the most specific terms we use. Therefore, Sterling Vineyards Merlot would be an instance in the knowledge base.

On the other hand, if we would like to maintain an inventory of wines in the restaurant in addition to the knowledge base of good wine-food pairings, individual bottles of each wine may become individual instances in our knowledge base.

Similarly, if we would like to record different properties for each specific vintage of the Sterling Vineyards Merlot, then the specific vintage of the wine is an instance in a knowledge base and Sterling Vineyards Merlot is a class containing instances for all its vintages.

Another rule can “move” some individual instances into the set of classes:

If concepts form a natural hierarchy, then we should represent them as classes

Consider the wine regions. Initially, we may define main wine regions, such as France, United States, Germany, and so on, as classes and specific wine regions within these large regions as instances. For example, Bourgogne region is an instance of the French region class. However, we would also like to say that the Cotes d’Or region is a Bourgogne region. Therefore, Bourgogne region must be a class (in order to have subclasses or instances). However, making Bourgogne region a class and Cotes d’Or region an instance of Bourgogne region seems arbitrary: it is very hard to clearly distinguish which regions are classes and which are instances. Therefore, we define all wine regions as classes. Protégé-2000 allows users to specify some classes as Abstract, signifying that the class cannot have any direct instances. In our case, all region classes are abstract ([Figure 8](#Figure8)).

![image016.jpg](https://protege.stanford.edu/publications/ontology_development/image016.jpg)

Figure 8. Hierarchy of wine regions. The "A" icons next to class names indicate that the classes are abstract and cannot have any direct instances.

The same class hierarchy would be incorrect if we omitted the word “region” from the class names. We cannot say that the class Alsace is a subclass of the class France: Alsace is not a kind of France. However, Alsace region is a kind of a French region.

Only classes can be arranged in a hierarchy—knowledge-representation systems do not have a notion of sub-instance. Therefore, if there is a natural hierarchy among terms, such as in terminological hierarchies from Section 4.2, we should define these terms as classes even though they may not have any instances of their own.

## 4.7 Limiting the scope

As a final note on defining a class hierarchy, the following set of rules is always helpful in deciding when an ontology definition is complete:

The ontology should not contain all the possible information about the domain: you do not need to specialize (or generalize) more than you need for your application (at most one extra level each way).

For our wine and food example, we do not need to know what paper is used for the labels or how to cook shrimp dishes. 

Similarly, the ontology should not contain all the possible properties of and distinctions among classes in the hierarchy.

In our ontology, we certainly do not include all the properties that a wine or food could have. We represented the most salient properties of the classes of items in our ontology. Even though wine books would tell us the size of grapes, we have not included this knowledge. Similarly, we have not added all relationships that one could imagine among all the terms in our system. For example, we do not include relationships such as favorite wine and favorite food in the ontology just to allow a more complete representation of all of the interconnections between the terms we have defined.

The last rules also applies to establishing relations among concepts that we have already included in the ontology. Consider an ontology describing biology experiments. The ontology will likely contain a concept of Biological organisms. It will also contain a concept of an Experimenter performing an experiment (with his name, affiliation, etc.). It is true that an experimenter, as a person, also happens to be a biological organism. However, we probably should not incorporate this distinction in the ontology: for the purposes of this representation an experimenter is not a biological organism and we will probably never conduct experiments on the experimenters themselves. If we were representing everything we can say about the classes in the ontology, an Experimenter would become a subclass of Biological Organism. However, we do not need to include this knowledge for the foreseeable applications. In fact, including this type of additional classification for existing classes actually hurts: now an instance of an Experimenter will have slots for weight, age, species, and other data pertaining to a biological organism, but absolutely irrelevant in the context of describing an experiment. However, we should record such design decision in the documentation for the benefit of the users who will be looking at this ontology and who may not be aware of the application we had in mind.

## 4.8 Disjoint subclasses

Many systems allow us to specify explicitly that several classes are **disjoint**. Classes are disjoint if they cannot have any instances in common. For example, the Dessert wine and the White wine classes in our ontology are *not* disjoint: there are many wines that are instances of both. The Rothermel Trockenbeerenauslese Riesling instance of the Sweet Riesling class is one such example. At the same time, the Red wine and the White wine classes are disjoint: no wine can be simultaneously red and white. Specifying that classes are disjoint enables the system to validate the ontology better. If we declare the Red wine and the White wine classes to be disjoint and later create a class that is a subclass of both Riesling (a subclass of White wine) and Port (a subclass of Red wine), a system can indicate that there is a modeling error.

---

*Archived from Stanford / Protégé publication for research. The source URL is authoritative if content diverges.*
