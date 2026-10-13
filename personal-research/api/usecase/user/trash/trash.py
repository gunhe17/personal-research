from __future__ import annotations

from usecase.common import store
from usecase.conversation.record import record as conversations
from usecase.space.record import record as spaces


# #
# trash

def listed() -> dict:
    found = [c for domain in conversations.DOMAINS for c in conversations.deleted(domain=domain)]

    return {
        "spaces": spaces.deleted(),
        "conversations": sorted(found, key=lambda c: c["deleted_at"], reverse=True),
    }


def restore(*, data: dict) -> dict:
    kind = data.get("kind")
    id = str(data.get("id") or "")
    if kind == "space":
        return spaces.restore(id=id)
    if kind == "conversation" and data.get("domain") in conversations.DOMAINS:
        return conversations.restore(domain=data["domain"], id=id)
    raise ValueError("되살릴 항목이 올바르지 않습니다.")


# #
# check

if __name__ == "__main__":
    import tempfile
    from pathlib import Path

    store.DATABASE = Path(tempfile.mkdtemp()) / "check.db"
    store.CURRENT.set(store.USER)
    space = spaces.create(data={"title": "S"})
    inside = conversations.create(domain="space", data={"space_id": space["id"]})
    alone = conversations.create(domain="agent", data={})
    conversations.remove(domain="agent", id=alone["id"])
    spaces.remove(id=space["id"])
    found = listed()
    assert [s["id"] for s in found["spaces"]] == [space["id"]] and [c["id"] for c in found["conversations"]] == [alone["id"]]
    for wrong in ({"kind": "material", "id": space["id"]}, {"kind": "conversation", "domain": "x", "id": alone["id"]}):
        try:
            restore(data=wrong)
        except ValueError:
            pass
        else:
            raise AssertionError(wrong)
    try:
        restore(data={"kind": "conversation", "domain": "space", "id": inside["id"]})
    except ValueError:
        pass
    else:
        raise AssertionError("cascaded conversation")
    assert restore(data={"kind": "space", "id": space["id"]})["conversations"][0]["id"] == inside["id"]
    assert restore(data={"kind": "conversation", "domain": "agent", "id": alone["id"]})["id"] == alone["id"]
    assert listed() == {"spaces": [], "conversations": []}
    print("ok")
