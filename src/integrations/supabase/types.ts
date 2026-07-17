export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string
          details: Json
          entity: string
          entity_id: string | null
          entity_label: string | null
          id: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          entity: string
          entity_id?: string | null
          entity_label?: string | null
          id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          entity?: string
          entity_id?: string | null
          entity_label?: string | null
          id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      allowed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          nome: string | null
          role: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          nome?: string | null
          role?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          nome?: string | null
          role?: string
        }
        Relationships: []
      }
      atividades_anexos: {
        Row: {
          board_id: string
          card_id: string
          created_at: string
          filename: string
          id: string
          mime_type: string
          size_bytes: number
          storage_path: string
          uploaded_by: string
          uploaded_by_email: string | null
        }
        Insert: {
          board_id: string
          card_id: string
          created_at?: string
          filename: string
          id?: string
          mime_type: string
          size_bytes: number
          storage_path: string
          uploaded_by: string
          uploaded_by_email?: string | null
        }
        Update: {
          board_id?: string
          card_id?: string
          created_at?: string
          filename?: string
          id?: string
          mime_type?: string
          size_bytes?: number
          storage_path?: string
          uploaded_by?: string
          uploaded_by_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atividades_anexos_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "atividades_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_anexos_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "atividades_boards_resumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_anexos_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "atividades_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades_atividade_log: {
        Row: {
          card_id: string
          created_at: string
          entity: string
          id: string
          payload: Json
          tipo: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          card_id: string
          created_at?: string
          entity?: string
          id?: string
          payload?: Json
          tipo: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          card_id?: string
          created_at?: string
          entity?: string
          id?: string
          payload?: Json
          tipo?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atividades_atividade_log_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "atividades_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades_board_favoritos: {
        Row: {
          board_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          board_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          board_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atividades_board_favoritos_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "atividades_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_board_favoritos_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "atividades_boards_resumo"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades_board_historico: {
        Row: {
          board_id: string
          created_at: string
          evento: string
          id: string
          payload: Json
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          board_id: string
          created_at?: string
          evento: string
          id?: string
          payload?: Json
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          board_id?: string
          created_at?: string
          evento?: string
          id?: string
          payload?: Json
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atividades_board_historico_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "atividades_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_board_historico_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "atividades_boards_resumo"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades_board_membros: {
        Row: {
          board_id: string
          convidado_por: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["atividades_board_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          board_id: string
          convidado_por?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["atividades_board_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          board_id?: string
          convidado_por?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["atividades_board_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atividades_board_membros_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "atividades_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_board_membros_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "atividades_boards_resumo"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades_boards: {
        Row: {
          arquivado: boolean
          arquivado_em: string | null
          background: string | null
          cor: string | null
          cover_url: string | null
          created_at: string
          criado_por: string | null
          descricao: string | null
          icone: string | null
          id: string
          nome: string
          ordem: number
          slug: string
          updated_at: string
          visibilidade: string
          workspace_id: string
        }
        Insert: {
          arquivado?: boolean
          arquivado_em?: string | null
          background?: string | null
          cor?: string | null
          cover_url?: string | null
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          icone?: string | null
          id?: string
          nome: string
          ordem?: number
          slug: string
          updated_at?: string
          visibilidade?: string
          workspace_id: string
        }
        Update: {
          arquivado?: boolean
          arquivado_em?: string | null
          background?: string | null
          cor?: string | null
          cover_url?: string | null
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          icone?: string | null
          id?: string
          nome?: string
          ordem?: number
          slug?: string
          updated_at?: string
          visibilidade?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atividades_boards_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "atividades_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades_card_labels: {
        Row: {
          card_id: string
          created_at: string
          label_id: string
        }
        Insert: {
          card_id: string
          created_at?: string
          label_id: string
        }
        Update: {
          card_id?: string
          created_at?: string
          label_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atividades_card_labels_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "atividades_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_card_labels_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "atividades_labels"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades_cards: {
        Row: {
          board_id: string
          checklist: Json
          coluna_id: string
          concluido: boolean
          cover_cor: string | null
          created_at: string
          created_by: string | null
          data_conclusao: string | null
          data_entrega: string | null
          descricao: string
          id: string
          links: Json
          ordem: number
          prioridade: string
          responsavel_id: string | null
          responsavel_ids: string[]
          responsavel_persona_ids: string[]
          solucao_id: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          board_id: string
          checklist?: Json
          coluna_id: string
          concluido?: boolean
          cover_cor?: string | null
          created_at?: string
          created_by?: string | null
          data_conclusao?: string | null
          data_entrega?: string | null
          descricao?: string
          id?: string
          links?: Json
          ordem?: number
          prioridade?: string
          responsavel_id?: string | null
          responsavel_ids?: string[]
          responsavel_persona_ids?: string[]
          solucao_id?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          board_id?: string
          checklist?: Json
          coluna_id?: string
          concluido?: boolean
          cover_cor?: string | null
          created_at?: string
          created_by?: string | null
          data_conclusao?: string | null
          data_entrega?: string | null
          descricao?: string
          id?: string
          links?: Json
          ordem?: number
          prioridade?: string
          responsavel_id?: string | null
          responsavel_ids?: string[]
          responsavel_persona_ids?: string[]
          solucao_id?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "atividades_cards_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "atividades_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_cards_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "atividades_boards_resumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_cards_coluna_id_fkey"
            columns: ["coluna_id"]
            isOneToOne: false
            referencedRelation: "atividades_colunas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_cards_solucao_id_fkey"
            columns: ["solucao_id"]
            isOneToOne: false
            referencedRelation: "demanda_solucoes"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades_colunas: {
        Row: {
          arquivada: boolean
          arquivada_em: string | null
          board_id: string
          chave: string
          created_at: string
          id: string
          nome: string
          ordem: number
          wip_limit: number | null
        }
        Insert: {
          arquivada?: boolean
          arquivada_em?: string | null
          board_id: string
          chave: string
          created_at?: string
          id?: string
          nome: string
          ordem?: number
          wip_limit?: number | null
        }
        Update: {
          arquivada?: boolean
          arquivada_em?: string | null
          board_id?: string
          chave?: string
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          wip_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "atividades_colunas_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "atividades_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_colunas_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "atividades_boards_resumo"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades_comentarios: {
        Row: {
          card_id: string
          created_at: string
          id: string
          texto: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          card_id: string
          created_at?: string
          id?: string
          texto: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          card_id?: string
          created_at?: string
          id?: string
          texto?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atividades_comentarios_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "atividades_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades_import_entities: {
        Row: {
          created_at: string
          entity_type: string
          external_id: string
          id: string
          job_id: string
          local_id: string | null
          source: string
        }
        Insert: {
          created_at?: string
          entity_type: string
          external_id: string
          id?: string
          job_id: string
          local_id?: string | null
          source: string
        }
        Update: {
          created_at?: string
          entity_type?: string
          external_id?: string
          id?: string
          job_id?: string
          local_id?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "atividades_import_entities_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "atividades_import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades_import_jobs: {
        Row: {
          adapter_version: string
          board_id_local: string | null
          concluido_em: string | null
          created_at: string
          criado_por: string
          file_hash: string | null
          file_name: string | null
          file_size: number | null
          id: string
          iniciado_em: string | null
          options: Json
          progress: Json
          report: Json
          resolutions: Json
          runner_version: string
          snapshot_version: string
          source: string
          status: string
          target_mode: string
          updated_at: string
        }
        Insert: {
          adapter_version: string
          board_id_local?: string | null
          concluido_em?: string | null
          created_at?: string
          criado_por: string
          file_hash?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          iniciado_em?: string | null
          options?: Json
          progress?: Json
          report?: Json
          resolutions?: Json
          runner_version: string
          snapshot_version: string
          source: string
          status?: string
          target_mode: string
          updated_at?: string
        }
        Update: {
          adapter_version?: string
          board_id_local?: string | null
          concluido_em?: string | null
          created_at?: string
          criado_por?: string
          file_hash?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          iniciado_em?: string | null
          options?: Json
          progress?: Json
          report?: Json
          resolutions?: Json
          runner_version?: string
          snapshot_version?: string
          source?: string
          status?: string
          target_mode?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "atividades_import_jobs_board_id_local_fkey"
            columns: ["board_id_local"]
            isOneToOne: false
            referencedRelation: "atividades_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_import_jobs_board_id_local_fkey"
            columns: ["board_id_local"]
            isOneToOne: false
            referencedRelation: "atividades_boards_resumo"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades_import_member_map: {
        Row: {
          created_at: string
          criado_por: string
          id: string
          source: string
          source_member_id: string
          source_username: string | null
          strategy: string
          target_user_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          criado_por: string
          id?: string
          source: string
          source_member_id: string
          source_username?: string | null
          strategy: string
          target_user_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          criado_por?: string
          id?: string
          source?: string
          source_member_id?: string
          source_username?: string | null
          strategy?: string
          target_user_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      atividades_label_favoritos: {
        Row: {
          created_at: string
          label_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          label_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          label_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atividades_label_favoritos_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "atividades_labels"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades_labels: {
        Row: {
          board_id: string
          cor: string
          created_at: string
          favorita: boolean
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          board_id: string
          cor?: string
          created_at?: string
          favorita?: boolean
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          board_id?: string
          cor?: string
          created_at?: string
          favorita?: boolean
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "atividades_labels_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "atividades_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_labels_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "atividades_boards_resumo"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades_personas: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      atividades_workspaces: {
        Row: {
          arquivado: boolean
          cor: string | null
          created_at: string
          criado_por: string | null
          descricao: string | null
          icone: string | null
          id: string
          nome: string
          slug: string
          updated_at: string
        }
        Insert: {
          arquivado?: boolean
          cor?: string | null
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          icone?: string | null
          id?: string
          nome: string
          slug: string
          updated_at?: string
        }
        Update: {
          arquivado?: boolean
          cor?: string | null
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          icone?: string | null
          id?: string
          nome?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      bloco_connect_recursos: {
        Row: {
          ativo: boolean
          chave: string | null
          colunas: string[]
          created_at: string
          id: string
          nome_logico: string
          recurso: string
          tipo: string
        }
        Insert: {
          ativo?: boolean
          chave?: string | null
          colunas?: string[]
          created_at?: string
          id?: string
          nome_logico: string
          recurso: string
          tipo: string
        }
        Update: {
          ativo?: boolean
          chave?: string | null
          colunas?: string[]
          created_at?: string
          id?: string
          nome_logico?: string
          recurso?: string
          tipo?: string
        }
        Relationships: []
      }
      criterios_solucoes: {
        Row: {
          complexidade: number
          data_atualizacao: string
          data_criacao: string
          frequencia_uso: number
          id: string
          importancia: number
          resultado_financeiro: number
          solucao_id: string
        }
        Insert: {
          complexidade?: number
          data_atualizacao?: string
          data_criacao?: string
          frequencia_uso?: number
          id?: string
          importancia?: number
          resultado_financeiro?: number
          solucao_id: string
        }
        Update: {
          complexidade?: number
          data_atualizacao?: string
          data_criacao?: string
          frequencia_uso?: number
          id?: string
          importancia?: number
          resultado_financeiro?: number
          solucao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "criterios_solucoes_solucao_id_fkey"
            columns: ["solucao_id"]
            isOneToOne: true
            referencedRelation: "solucoes"
            referencedColumns: ["id"]
          },
        ]
      }
      demanda_melhorias: {
        Row: {
          data: string
          descricao: string
          id: string
          solucao_id: string
          status: string
        }
        Insert: {
          data?: string
          descricao: string
          id?: string
          solucao_id: string
          status?: string
        }
        Update: {
          data?: string
          descricao?: string
          id?: string
          solucao_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "demanda_melhorias_solucao_id_fkey"
            columns: ["solucao_id"]
            isOneToOne: false
            referencedRelation: "demanda_solucoes"
            referencedColumns: ["id"]
          },
        ]
      }
      demanda_solucoes: {
        Row: {
          created_at: string
          created_by: string | null
          data_fim_prevista: string | null
          data_inicio_prevista: string | null
          descricao: string
          id: string
          link: string | null
          responsavel_id: string | null
          solicitacao_id: string | null
          titulo: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_fim_prevista?: string | null
          data_inicio_prevista?: string | null
          descricao?: string
          id?: string
          link?: string | null
          responsavel_id?: string | null
          solicitacao_id?: string | null
          titulo: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_fim_prevista?: string | null
          data_inicio_prevista?: string | null
          descricao?: string
          id?: string
          link?: string | null
          responsavel_id?: string | null
          solicitacao_id?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "demanda_solucoes_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      demanda_tasks: {
        Row: {
          assigned_to: string | null
          concluida: boolean
          created_at: string
          created_by: string | null
          id: string
          ordem: number
          solicitacao_id: string
          titulo: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          concluida?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          ordem?: number
          solicitacao_id: string
          titulo: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          concluida?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          ordem?: number
          solicitacao_id?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      ia_uso_log: {
        Row: {
          acao: string | null
          created_at: string
          id: string
          modelo: string | null
          status: string | null
          tokens_in: number | null
          tokens_out: number | null
          user_id: string | null
        }
        Insert: {
          acao?: string | null
          created_at?: string
          id?: string
          modelo?: string | null
          status?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string | null
        }
        Update: {
          acao?: string | null
          created_at?: string
          id?: string
          modelo?: string | null
          status?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          created_at: string
          created_by: string | null
          created_by_email: string | null
          id: string
          lida: boolean
          lida_em: string | null
          mensagem: string
          solicitacao_id: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          id?: string
          lida?: boolean
          lida_em?: string | null
          mensagem: string
          solicitacao_id?: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          id?: string
          lida?: boolean
          lida_em?: string | null
          mensagem?: string
          solicitacao_id?: string | null
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      plataformas: {
        Row: {
          created_at: string
          descricao: string
          icone: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string
          icone?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string
          icone?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          nome?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      setores: {
        Row: {
          created_at: string
          descricao: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      solicitacoes: {
        Row: {
          atendida_em: string | null
          atendida_por: string | null
          atendida_por_sistema_slug: string | null
          atendida_url: string | null
          avaliado_em: string | null
          avaliado_por: string | null
          complexidade: number
          complexidade_dev: number | null
          consolidada_em: string | null
          created_at: string
          data_fim_prevista: string | null
          data_inicio_prevista: string | null
          descricao: string
          desfecho: string | null
          email: string
          frequencia: number
          id: string
          integracoes: string[]
          match_atualizado_em: string | null
          match_sugestoes: Json | null
          nome: string
          notas_tecnicas: string | null
          notas_tecnicas_complexidade: string | null
          retorno: number
          score: number
          score_final: number | null
          score_solicitante: number | null
          setor: string | null
          sistema_alvo_slug: string | null
          solicitante_nome: string
          status: string
          telefone: string | null
          tem_integracao: boolean
          tipo: string | null
          tipo_demanda: string | null
          titulo: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          atendida_em?: string | null
          atendida_por?: string | null
          atendida_por_sistema_slug?: string | null
          atendida_url?: string | null
          avaliado_em?: string | null
          avaliado_por?: string | null
          complexidade?: number
          complexidade_dev?: number | null
          consolidada_em?: string | null
          created_at?: string
          data_fim_prevista?: string | null
          data_inicio_prevista?: string | null
          descricao: string
          desfecho?: string | null
          email: string
          frequencia?: number
          id?: string
          integracoes?: string[]
          match_atualizado_em?: string | null
          match_sugestoes?: Json | null
          nome: string
          notas_tecnicas?: string | null
          notas_tecnicas_complexidade?: string | null
          retorno?: number
          score?: number
          score_final?: number | null
          score_solicitante?: number | null
          setor?: string | null
          sistema_alvo_slug?: string | null
          solicitante_nome?: string
          status?: string
          telefone?: string | null
          tem_integracao?: boolean
          tipo?: string | null
          tipo_demanda?: string | null
          titulo?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          atendida_em?: string | null
          atendida_por?: string | null
          atendida_por_sistema_slug?: string | null
          atendida_url?: string | null
          avaliado_em?: string | null
          avaliado_por?: string | null
          complexidade?: number
          complexidade_dev?: number | null
          consolidada_em?: string | null
          created_at?: string
          data_fim_prevista?: string | null
          data_inicio_prevista?: string | null
          descricao?: string
          desfecho?: string | null
          email?: string
          frequencia?: number
          id?: string
          integracoes?: string[]
          match_atualizado_em?: string | null
          match_sugestoes?: Json | null
          nome?: string
          notas_tecnicas?: string | null
          notas_tecnicas_complexidade?: string | null
          retorno?: number
          score?: number
          score_final?: number | null
          score_solicitante?: number | null
          setor?: string | null
          sistema_alvo_slug?: string | null
          solicitante_nome?: string
          status?: string
          telefone?: string | null
          tem_integracao?: boolean
          tipo?: string | null
          tipo_demanda?: string | null
          titulo?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_consolidada_em_fkey"
            columns: ["consolidada_em"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_score_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          changed_by_email: string | null
          id: string
          new_complexidade_dev: number | null
          new_notas: string | null
          old_complexidade_dev: number | null
          old_notas: string | null
          solicitacao_id: string
          trigger_source: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          changed_by_email?: string | null
          id?: string
          new_complexidade_dev?: number | null
          new_notas?: string | null
          old_complexidade_dev?: number | null
          old_notas?: string | null
          solicitacao_id: string
          trigger_source?: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          changed_by_email?: string | null
          id?: string
          new_complexidade_dev?: number | null
          new_notas?: string | null
          old_complexidade_dev?: number | null
          old_notas?: string | null
          solicitacao_id?: string
          trigger_source?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_score_history_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      solucao_diagrama_conexao_colunas: {
        Row: {
          conexao_id: string
          created_at: string
          created_by: string | null
          id: string
          nome: string
          ordem: number
          tipo: string
          updated_at: string
        }
        Insert: {
          conexao_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          nome: string
          ordem?: number
          tipo?: string
          updated_at?: string
        }
        Update: {
          conexao_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          nome?: string
          ordem?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solucao_diagrama_conexao_colunas_conexao_id_fkey"
            columns: ["conexao_id"]
            isOneToOne: false
            referencedRelation: "solucao_diagrama_conexoes"
            referencedColumns: ["id"]
          },
        ]
      }
      solucao_diagrama_conexoes: {
        Row: {
          created_at: string
          created_by: string | null
          curvatura_x: number | null
          curvatura_y: number | null
          id: string
          label: string | null
          source_id: string
          target_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          curvatura_x?: number | null
          curvatura_y?: number | null
          id?: string
          label?: string | null
          source_id: string
          target_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          curvatura_x?: number | null
          curvatura_y?: number | null
          id?: string
          label?: string | null
          source_id?: string
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solucao_diagrama_conexoes_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "demanda_solucoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solucao_diagrama_conexoes_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "demanda_solucoes"
            referencedColumns: ["id"]
          },
        ]
      }
      solucao_diagrama_notas: {
        Row: {
          altura: number
          cabecalho: string | null
          cor: string
          created_at: string
          created_by: string | null
          id: string
          largura: number
          texto: string
          updated_at: string
          x: number
          y: number
        }
        Insert: {
          altura?: number
          cabecalho?: string | null
          cor?: string
          created_at?: string
          created_by?: string | null
          id?: string
          largura?: number
          texto?: string
          updated_at?: string
          x?: number
          y?: number
        }
        Update: {
          altura?: number
          cabecalho?: string | null
          cor?: string
          created_at?: string
          created_by?: string | null
          id?: string
          largura?: number
          texto?: string
          updated_at?: string
          x?: number
          y?: number
        }
        Relationships: []
      }
      solucao_diagrama_posicoes: {
        Row: {
          solucao_id: string
          updated_at: string
          updated_by: string | null
          x: number
          y: number
        }
        Insert: {
          solucao_id: string
          updated_at?: string
          updated_by?: string | null
          x?: number
          y?: number
        }
        Update: {
          solucao_id?: string
          updated_at?: string
          updated_by?: string | null
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "solucao_diagrama_posicoes_solucao_id_fkey"
            columns: ["solucao_id"]
            isOneToOne: true
            referencedRelation: "demanda_solucoes"
            referencedColumns: ["id"]
          },
        ]
      }
      solucao_tasks: {
        Row: {
          assigned_to: string | null
          concluida: boolean
          created_at: string
          created_by: string | null
          id: string
          ordem: number
          solucao_id: string
          titulo: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          concluida?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          ordem?: number
          solucao_id: string
          titulo: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          concluida?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          ordem?: number
          solucao_id?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      solucoes: {
        Row: {
          data_atualizacao: string
          data_criacao: string
          descricao: string
          funcao: string
          id: string
          nome: string
          plataforma_id: string
          setor_id: string
          status: string
        }
        Insert: {
          data_atualizacao?: string
          data_criacao?: string
          descricao?: string
          funcao?: string
          id?: string
          nome: string
          plataforma_id: string
          setor_id: string
          status?: string
        }
        Update: {
          data_atualizacao?: string
          data_criacao?: string
          descricao?: string
          funcao?: string
          id?: string
          nome?: string
          plataforma_id?: string
          setor_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "solucoes_plataforma_id_fkey"
            columns: ["plataforma_id"]
            isOneToOne: false
            referencedRelation: "plataformas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solucoes_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      tipos_demanda: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      atividades_boards_resumo: {
        Row: {
          arquivado: boolean | null
          background: string | null
          cards_abertos: number | null
          cor: string | null
          cover_url: string | null
          created_at: string | null
          criado_por: string | null
          descricao: string | null
          favorito: boolean | null
          icone: string | null
          id: string | null
          meu_papel: Database["public"]["Enums"]["atividades_board_role"] | null
          nome: string | null
          slug: string | null
          total_cards: number | null
          total_membros: number | null
          ultima_atividade: string | null
          updated_at: string | null
          visibilidade: string | null
          workspace_id: string | null
          workspace_nome: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atividades_boards_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "atividades_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      developers: {
        Row: {
          email: string | null
          id: string | null
          nome: string | null
        }
        Insert: {
          email?: string | null
          id?: string | null
          nome?: string | null
        }
        Update: {
          email?: string | null
          id?: string | null
          nome?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_list_accounts: {
        Args: never
        Returns: {
          created_at: string
          email: string
          nome: string
          profile_nome: string
          role: string
          user_id: string
        }[]
      }
      atividades_board_add_member: {
        Args: {
          _board_id: string
          _role?: Database["public"]["Enums"]["atividades_board_role"]
          _user_id: string
        }
        Returns: undefined
      }
      atividades_board_delete: {
        Args: { _board_id: string }
        Returns: undefined
      }
      atividades_board_remove_member: {
        Args: { _board_id: string; _user_id: string }
        Returns: undefined
      }
      atividades_board_role: {
        Args: { _board_id: string; _user_id?: string }
        Returns: Database["public"]["Enums"]["atividades_board_role"]
      }
      atividades_board_set_arquivado: {
        Args: { _arquivado: boolean; _board_id: string }
        Returns: undefined
      }
      atividades_board_set_background: {
        Args: { _background: string; _board_id: string; _cover_url: string }
        Returns: undefined
      }
      atividades_board_set_member_role: {
        Args: {
          _board_id: string
          _role: Database["public"]["Enums"]["atividades_board_role"]
          _user_id: string
        }
        Returns: undefined
      }
      atividades_board_toggle_favorito: {
        Args: { _board_id: string }
        Returns: boolean
      }
      atividades_board_update: {
        Args: {
          _background?: string
          _board_id: string
          _cor?: string
          _cover_url?: string
          _descricao?: string
          _icone?: string
          _nome?: string
          _visibilidade?: string
        }
        Returns: undefined
      }
      atividades_can_admin_board: {
        Args: { _board_id: string; _user_id?: string }
        Returns: boolean
      }
      atividades_can_edit_board: {
        Args: { _board_id: string; _user_id?: string }
        Returns: boolean
      }
      atividades_can_view_board: {
        Args: { _board_id: string; _user_id?: string }
        Returns: boolean
      }
      atividades_coluna_create: {
        Args: { _board_id: string; _chave?: string; _nome: string }
        Returns: string
      }
      atividades_coluna_delete: {
        Args: { _coluna_id: string }
        Returns: undefined
      }
      atividades_coluna_duplicate: {
        Args: { _coluna_id: string }
        Returns: string
      }
      atividades_coluna_reorder: {
        Args: { _board_id: string; _items: Json }
        Returns: undefined
      }
      atividades_coluna_set_arquivada: {
        Args: { _arquivada: boolean; _coluna_id: string }
        Returns: undefined
      }
      atividades_coluna_set_wip: {
        Args: { _coluna_id: string; _wip: number }
        Returns: undefined
      }
      atividades_coluna_update: {
        Args: { _coluna_id: string; _nome?: string }
        Returns: undefined
      }
      atividades_create_board: {
        Args: {
          _background?: string
          _cor?: string
          _descricao?: string
          _icone?: string
          _nome: string
          _visibilidade?: string
          _workspace_id?: string
        }
        Returns: string
      }
      atividades_import_entity_get: {
        Args: { _entity_type: string; _external_id: string; _job_id: string }
        Returns: string
      }
      atividades_import_entity_register: {
        Args: {
          _entity_type: string
          _external_id: string
          _job_id: string
          _local_id: string
        }
        Returns: string
      }
      atividades_import_job_cancel: {
        Args: { _job_id: string }
        Returns: undefined
      }
      atividades_import_job_create: {
        Args: {
          _adapter_version: string
          _file_hash: string
          _file_name: string
          _file_size: number
          _options: Json
          _runner_version: string
          _snapshot_version: string
          _source: string
          _target_mode: string
        }
        Returns: string
      }
      atividades_import_job_finalize: {
        Args: {
          _board_id_local?: string
          _job_id: string
          _report: Json
          _status: string
        }
        Returns: undefined
      }
      atividades_import_job_update_progress: {
        Args: { _job_id: string; _progress: Json; _status?: string }
        Returns: undefined
      }
      atividades_import_member_map_list: {
        Args: { _source?: string }
        Returns: {
          source: string
          source_member_id: string
          source_username: string
          strategy: string
          target_user_id: string
          updated_at: string
        }[]
      }
      atividades_import_member_map_upsert: {
        Args: {
          _source: string
          _source_member_id: string
          _source_username: string
          _strategy: string
          _target_user_id: string
        }
        Returns: undefined
      }
      atividades_label_delete: {
        Args: { _label_id: string }
        Returns: undefined
      }
      atividades_label_reorder: {
        Args: { _board_id: string; _items: Json }
        Returns: undefined
      }
      atividades_label_set_favorita: {
        Args: { _fav: boolean; _label_id: string }
        Returns: undefined
      }
      atividades_label_toggle_favorita: {
        Args: { _label_id: string }
        Returns: boolean
      }
      atividades_label_upsert: {
        Args: { _board_id: string; _cor: string; _id: string; _nome: string }
        Returns: string
      }
      atividades_reorder_cards: { Args: { items: Json }; Returns: undefined }
      get_my_role: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_allowed_user: { Args: never; Returns: boolean }
      list_assignable_users: {
        Args: never
        Returns: {
          avatar_url: string
          email: string
          id: string
          nome: string
          role: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
      atividades_board_role: "owner" | "admin" | "member" | "observer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      atividades_board_role: ["owner", "admin", "member", "observer"],
    },
  },
} as const
