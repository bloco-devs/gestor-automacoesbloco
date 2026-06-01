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
          created_at: string
          email: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          nome?: string
          updated_at?: string
        }
        Update: {
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
          avaliado_em: string | null
          avaliado_por: string | null
          complexidade: number
          complexidade_dev: number | null
          created_at: string
          data_fim_prevista: string | null
          data_inicio_prevista: string | null
          descricao: string
          email: string
          frequencia: number
          id: string
          integracoes: string[]
          nome: string
          notas_tecnicas: string | null
          notas_tecnicas_complexidade: string | null
          retorno: number
          score: number
          setor: string | null
          solicitante_nome: string
          status: string
          telefone: string | null
          tem_integracao: boolean
          tipo: string | null
          titulo: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avaliado_em?: string | null
          avaliado_por?: string | null
          complexidade?: number
          complexidade_dev?: number | null
          created_at?: string
          data_fim_prevista?: string | null
          data_inicio_prevista?: string | null
          descricao: string
          email: string
          frequencia?: number
          id?: string
          integracoes?: string[]
          nome: string
          notas_tecnicas?: string | null
          notas_tecnicas_complexidade?: string | null
          retorno?: number
          score?: number
          setor?: string | null
          solicitante_nome?: string
          status?: string
          telefone?: string | null
          tem_integracao?: boolean
          tipo?: string | null
          titulo?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avaliado_em?: string | null
          avaliado_por?: string | null
          complexidade?: number
          complexidade_dev?: number | null
          created_at?: string
          data_fim_prevista?: string | null
          data_inicio_prevista?: string | null
          descricao?: string
          email?: string
          frequencia?: number
          id?: string
          integracoes?: string[]
          nome?: string
          notas_tecnicas?: string | null
          notas_tecnicas_complexidade?: string | null
          retorno?: number
          score?: number
          setor?: string | null
          solicitante_nome?: string
          status?: string
          telefone?: string | null
          tem_integracao?: boolean
          tipo?: string | null
          titulo?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
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
          email: string
          id: string
          nome: string
          role: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    },
  },
} as const
