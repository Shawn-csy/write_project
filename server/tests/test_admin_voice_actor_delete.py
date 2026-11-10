from models import Persona, PersonaRole, PublicDemoSubmission, User


def test_delete_voice_actor_with_role_preserves_demo_credit(client, db_session):
    db_session.add_all([
        User(id="voice-owner", handle="voice-owner"),
        Persona(id="voice-only", ownerId="voice-owner", displayName="測試聲演", tags=["聲演"]),
        PersonaRole(id="voice-role", personaId="voice-only", role="voice_actor"),
        PublicDemoSubmission(
            id="voice-demo",
            scriptType="internal",
            demoUrl="https://example.com/demo",
            status="approved",
            voiceActorPersonaId="voice-only",
            voiceActorIds=["voice-only"],
            manualVoiceActors=[{"name": "測試聲演", "personaId": "voice-only"}],
        ),
    ])
    db_session.commit()

    response = client.delete("/api/admin/voice-actors/voice-only", headers={"X-User-ID": "admin-owner"})

    assert response.status_code == 200
    assert response.json() == {"success": True, "preservedAuthor": False}
    assert db_session.get(Persona, "voice-only") is None
    assert db_session.get(PersonaRole, "voice-role") is None
    demo = db_session.get(PublicDemoSubmission, "voice-demo")
    assert demo.voiceActorPersonaId is None
    assert demo.voiceActorIds == []
    assert demo.manualVoiceActors == [{"name": "測試聲演"}]
