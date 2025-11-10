# TODO: Add Bradesco Bank Support to pixParser.js

- [x] Add detection logic for Bradesco receipts (check for keywords: "bradesco", "transação concluída pelo bradesco celular")
- [x] Extract pagador from "Dados de quem pagou Nome"
- [x] Extract destinatario from "Dados de quem recebeu Nome"
- [x] Extract pagadorBanco from "Instituição" under "Dados de quem pagou"
- [x] Extract banco from "Instituição" under "Dados de quem recebeu"
- [x] Extract chavePix from "Chave"
- [x] Extract idTransacao from "Número de Controle"
- [x] Extract valor from "Valor: R$ [amount]"
- [x] Extract data and hora from "Data e Hora" fields
- [x] Extract observacoes from "Transação concluída pelo BRADESCO CELULAR"
