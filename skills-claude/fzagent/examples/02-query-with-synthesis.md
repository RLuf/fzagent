# Exemplo 2: consulta com sintese

## Pedido do usuario

> "O que o wiki diz sobre o padrao de event-driven do openclaw?"

## Passos do agente

1. ```bash
   fzagent wiki query "event-driven openclaw" --top 5 --synthesize
   ```

2. Apresente sintese:

> O openclaw introduz event-driven na fase 2 (steps 07-10). EventBus com
> queue interna + atomic persist [[buildoc]]. Subscribers tipados por
> classe de evento. ChannelWorker publica InboundEvent; AgentWorker
> consome; DeliveryWorker reentregra OutboundEvent ao canal certo
> [[openclaw]]. (...)

3. Liste hits com source e score.
4. Sugira proxima pergunta: "Quer ver o equivalente TypeScript que
   implementamos em @fzagent/core?"
