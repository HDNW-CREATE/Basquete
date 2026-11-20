# mascotinho

Um caranguejinho em pixel art que mora logo acima do campo de digitação do Claude Code e reage ao que o Claude está fazendo: fica de boa esperando, acende uma lâmpada quando está pensando, gira uma engrenagem quando roda uma ferramenta, fica com olhos de X quando dá erro e pula com moedas quando termina. Cada resposta rende moedas (1 a cada mil tokens) e experiência; ele sobe de nível (Filhote, Aprendiz, Ajudante, Parceiro, Craque, Lenda).

Oito modelos para escolher com as setas ‹ ›: Clássico, Basqueteiro, Boleiro, Peão de Obra, DJ, Mago, Pirata e Chef.

Comandos: `/buddy` mostra ou esconde, `/buddy lista` lista os modelos, `/buddy basqueteiro` (ou `/buddy 2`) escolhe um.

## Instalar

No Claude Code, no campo de digitação de uma sessão no terminal:

```
/plugin install mascotinho --marketplace hdnw-create/basquete
```

Responda `y` para adicionar o marketplace e escolha o escopo de usuário (o primeiro) para ele aparecer em todas as suas sessões.

Pelo shell:

```
claude plugin install mascotinho --marketplace hdnw-create/basquete
```

No app desktop, onde `/plugin` não roda: clique no + ao lado do campo de digitação, depois em Plugins, Add marketplace com `hdnw-create/basquete`, e então Add plugin.
