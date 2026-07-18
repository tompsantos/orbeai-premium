from app.identity import build_identity


def test_identity_separates_memory_and_knowledge_contexts() -> None:
    prompt = build_identity(
        mode="research",
        memory_context="- preferência: respostas diretas",
        knowledge_context=(
            "- [research_report:res_123] protocolo jabuticaba: "
            "síntese rastreável do material persistido"
        ),
    )

    assert "Contexto de memória autorizado" in prompt
    assert "Conhecimento persistido selecionado" in prompt
    assert "respostas diretas" in prompt
    assert "research_report:res_123" in prompt
    assert "não alegue acesso a conteúdo além" in prompt
