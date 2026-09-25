# Defining properties — more details

In this section we discuss several more details to keep in mind when defining slots in the ontology (Step 5 and Step 6 in Section 3). Mainly, we discuss inverse slots and default values for a slot.

## 5.1 Inverse slots

A value of a slot may depend on a value of another slot. For example, if a wine was produced by a winery, then the winery produces that wine. These two relations, maker and produces, are called **inverse relations**. Storing the information “in both directions” is redundant. When we know that a wine is produced by a winery, an application using the knowledge base can always infer the value for the inverse relation that the winery produces the wine. However, from the knowledge-acquisition perspective it is convenient to have both pieces of information explicitly available. This approach allows users to fill in the wine in one case and the winery in another.. The knowledge-acquisition system could then automatically fill in the value for the inverse relation insuring consistency of the knowledge base.

Our example has a pair of inverse slots: the maker slot of the Wine class and the produces slot of the Winery class. When a user creates an instance of the Wine class and fills in the value for the maker slot, the system automatically adds the newly created instance to the produces slot of the corresponding Winery instance. For instance, when we say that Sterling Merlot is produced by the Sterling Vineyard winery, the system would automatically add Sterling Merlot to the list of wines that the Sterling Vineyard winery produces. ([Figure 9](#Figure9)).

![image018.gif](https://protege.stanford.edu/publications/ontology_development/image018.gif)

Figure 9. Instances with inverse slots. The slot produces for the class Winery is an inverse of the slot maker for the class Wine. Filling in one of the slots triggers an automatic update of the other. 

## 5.2 Default values

Many frame-based systems allow specification of default values for slots. If a particular slot value is the same for most instances of a class, we can define this value to be a **default** **value** for the slot. Then, when each new instance of a class containing this slot is created, the system fills in the default value automatically. We can then change the value to any other value that the facets will allow. That is, default values are there for convenience: they do not enforce any new restrictions on the model or change the model in any way. 

For example, if the majority of wines we are going to discuss are full-bodied wines, we can have “full” as a default value for the body of the wine. Then, unless we say otherwise, all wines we define would be full-bodied. 

Note that this is different from **slot values**. Slot values cannot be changed. For example, we can say that the slot sugar has value SWEET for the Dessert wine class. Then all the subclasses and instances of the Dessert wine class will have the SWEET value for the slot sugar. This value cannot be changed in any of the subclasses or instances of the class.

---

*Archived from Stanford / Protégé publication for research. The source URL is authoritative if content diverges.*
